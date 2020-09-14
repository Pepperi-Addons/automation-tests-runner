#!/usr/bin/env node

const fetch = require('node-fetch');
const { Command } = require('commander');

var addonUUID = "00000000-0000-0000-0000-000000000a91";
var testStatus;
var errorMessage = '';

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms);
    })
}

async function runTest(username, password, version, endpoint) {
    console.log("get JWT for ", username, " - ", password);
//////////////////////////////////////////////////////////////////////Token
    var data = "userName=" + username + "&password=" + password + "&scope=pepperi.apint pepperi.wacd offline_access&grant_type=password&client_id=ios.com.wrnty.peppery"
    const res = await fetch('https://idp.staging.pepperi.com/connect/token', {
        body: data,
        method: "POST",
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        }
    })
    
    const a = await res.json();
    console.log(a);
///////////////////////////////////////////////////////////////////////////////Upgrade PAPI version

    console.log("update version to ", version);
    
    const res1 = await fetch('https://papi.staging.pepperi.com/v1.0/addons/installed_addons/' + addonUUID + '/upgrade/' + version , {
        method: "POST",
        headers: {
            'Authorization': 'Bearer ' + a.access_token
        }
    })

    const b = await res1.json();
    console.log(b);


/////////////////////////////////////////////////////////////////////////////////Endpoint

    console.log("run test - ", endpoint);
    
    const res2 = await fetch('https://papi.staging.pepperi.com/V1.0/addons/api/async/871526f9-043b-4a4a-8cc1-7d443eadd008/' + endpoint , {
        method: "GET",
        headers: {
            'Authorization': 'Bearer ' + a.access_token
        }
    })

    const c = await res2.json();
    console.log(c);
    await sleep(5000);

//////////////////////////////////////////////////////////////////////////////////////
    console.log("analyze test");
    
    var i = 0;
    do {
        var res3 = await fetch('https://papi.staging.pepperi.com/V1.0' + c.URI , {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + a.access_token
            }
        })
        await sleep(30000);
        i++;
        var d = await res3.json();
 
    } while (d.Status.Name == 'InProgress' && i <= 50);
    if(d.Status.Name == 'Failure'){
        console.log(d.AuditInfo.ErrorMessage); 
        testStatus = false;
        errorMessage = d.AuditInfo.ErrorMessage;
    }
    else{
        var result = JSON.parse(d.AuditInfo.ResultObject);
        console.log(result)
        if(result.stats.failures == 0){
            testStatus = true;
            console.log(testStatus);
        }
        else{
            testStatus = false;
            console.log(result.stats.failures + ' tests failed')
        }
        
    }
    
return testStatus;
}

const program = new Command("automation tests")
    .description('A script for running automation tests')
    .requiredOption(
        '-u, --user-name <username>', 
        'The user to run the tests on'
    )
    .requiredOption(
        '-p, --password <password>', 
        'The password of the user to run the tests on'
    )
    .requiredOption(
        '-v, --papi-version <papiVersion>', 
        'The papi version'
    )
    .requiredOption(
        '-t, --test-endpoint <endpoint>', 
        'The papi version'
    )


program.parse(process.argv);

runTest(program['userName'], program['password'], program['papiVersion'], program['testEndpoint']).then(result => {
    process.exit(result ? 0 : 1)
})
/////////////////////////////////list of endPoints -> arg[5]
// run_scheduler_test
// run_codeJob_test
// run_addonInstaller_test
// run_addonJob_test
// run_codejobRetry_test
///////////////////////////////////////////////////////////
//node .\index.js -u CodeJobAutomation@pepperitest.com -p 123456 -v v280 -t api/run_addonJob_test 
    
