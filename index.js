#!/usr/bin/env node
import dotenvpkg from 'dotenv'
dotenvpkg.config();
import prompts from 'prompts';

import path from 'path';
import pkg from 'kleur';
const { green, red } = pkg
import { spawn, exec } from 'child_process'
import fs from 'fs';
import hyperlinker from 'hyperlinker';
import { deepStrictEqual } from 'assert';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import CFonts from 'cfonts';
// import pkgjson from './package.json';


import { createRequire } from "module"; // Bring in the ability to create the 'require' method
const require = createRequire(import.meta.url); // construct the require method
const { version } = require("./package.json")// use the require method

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import axios from 'axios';


/*
___________TESTS_______________
*______FROM  (NO REPOS)
* [ ✔️ ] - Load Prev Options + Load Prev Repos 
* [ ✔️ ] - Don't Load Prev Options + Don't Load Prev Repos 

*______FROM SCRATCH (NO REPOS, NO Options.json, No results.json)
* [ ✔️ ] - Load Prev Options + Load Prev Repos 
* [ ✔️ ] - Don't Load Prev Options + Don't Load Prev Repos 

*______FROM (NO Options.json, No results.json)
* [ ✔️ ] - Options + Log 
* [ ✔️ ] - No Options + No Log 
* [ ✔️ ] - No Options + Log 

*______FROM ALREADY DOWNLOADED FILES (REPOS,OPTIONS,RESULTS)
* [ ✔️ ] - Load Prev Options + Load Prev Repos
* [ ✔️ ] - Don't Load Prev Options + Don't Load Prev Repos + Don't Log + No Options
* [ ✔️ ] - Don't Load Prev Options + Don't Load Prev Repos + Log + Options

TODO: - Add React TS Client
TODO: - Add Additional server logic - check for dependency use bcryptjs, JWT_SECRET, admin, dotenv
TODO: - Clone works??

*/


const commandPrompts = {
    mainMenu: [{
        type: 'select',
        name: 'MenuSelection',
        message: 'Choose an option',
        choices: [
            { title: '➡️ Start', description: 'Start Pro_Grader', value: 'Start' },
            { title: 'ℹ️ About', description: 'About Pro_Grader', value: 'About' },
            { title: '🪲 Report A Bug', description: 'Send me a message about a bug/issue', value: 'Report' },
            { title: '❌ Empty Repos Folder', description: 'Clear out the repo files stored in app dir', value: 'EmptyRepos' },
            { title: '❌ Delete Config File', description: 'Delete the generated config file, this can be useful to fix any config issues', value: 'DelConfig' },
        ].filter(i => {

            if (!fs.existsSync(`${__dirname}` + "/config.json")) {
                return i.value !== 'DelConfig'
            } else {
                return i
            }
        }).filter(i => {
            if (fs.readdirSync(`${__dirname}/repos`).length === 1) {
                return i.value !== 'EmptyRepos'
            } else {
                return i
            }
        }),
        initial: 0,
    }],
    reportBug: [

        {
            type: 'text',
            name: 'EmailValue',
            message: `Input your email to receive a response`,
            validate: val => /^([-!# - '*+/-9=?A-Z^-~]+(\.[-!#-' * +/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)+$/.test(val) !== true ? 'Please enter a valid email address' : true
        },
        {
            type: 'text',
            name: 'BugValue',
            message: `List the bug or issue`,
        }
    ],
    loadConfig: [
        {
            type: 'toggle',
            name: 'LoadPrev',
            message: 'Previous options config found (config.json). Load it?',
            initial: true,
            active: 'Yes',
            inactive: 'No',

        }
    ],
    clientOrServerQuestion: [
        {
            type: 'select',
            name: 'Selection',
            message: 'Client or Server',
            choices: [
                { title: 'Client', description: 'React/FC Components', value: 'Client', disabled: true },
                { title: 'Server', description: 'Node Express Server', value: 'Server' },
            ],
            initial: 1,
        },
        {
            type: prev => prev === 'Client' ? 'multiselect' : null,
            name: 'ClientOptions',
            message: 'Client Options',
            choices: [
                { title: 'Red', value: '#ff0000', selected: true },
                { title: 'Green', value: '#00ff00', selected: true },
                { title: 'Blue', value: '#0000ff', selected: true }
            ],
            instructions: false,
            max: 2,
            hint: '- Space to select. Return to submit'
        },
        {
            type: prev => prev === 'Server' ? 'multiselect' : null,
            name: 'ServerOptions',
            message: 'Server Options',
            choices: [

                { title: 'Validated', value: { Validated: true }, description: 'Check for token on endpoint ', selected: true },
                { title: 'Async', value: { Async: true }, description: 'Show if endpoint is async', selected: true },
                { title: 'Bcrypt', value: { Bcrypt: true }, description: 'Is Bcrypt used in Auth Signup/Login?', selected: true },

            ],
            instructions: false,
            max: 3,
            hint: '- Space to select. Enter to submit',

        }
    ],
    logResultsQuestion: [
        {
            type: 'toggle',
            name: 'LogResults',
            message: 'Log Results?',
            initial: true,
            active: 'Yes',
            inactive: 'No'
        }
    ],
    gitHubPrevURLQuestion: [
        {
            type: 'toggle',
            name: 'LoadPrev',
            message: 'Use Current Repos in repos config?',
            initial: true,
            active: 'Yes',
            inactive: 'No'
        }
    ],
    gitHubURLsQuestion: [
        {
            type: 'list',
            name: 'Repos',
            message: `Enter Github Repo URLs Separated By Commas.`,
            initial: '',
            separator: ',',
            validate: value => value.length === 0 ? `URLs cannot be blank!` : true
        },
    ],

    gitHubCloneRepoQuestion: [
        {
            type: 'toggle',
            name: 'Reclone',
            message: 'Reclone repos on every execution?',
            initial: true,
            active: 'Yes',
            inactive: 'No',
            hint: 'hidy hooo'
        }
    ],

    optionsCorruptQuestion: [
        {
            type: 'message',
            name: 'OptionsCorrupt',
            message: 'Options file corrupt, it will be removed and rebuilt.',
            initial: true,
            active: 'Yes',
            // inactive: 'No'
        }
    ]
}

const { loadConfig, clientOrServerQuestion, logResultsQuestion, gitHubPrevURLQuestion, gitHubCloneRepoQuestion, gitHubURLsQuestion, optionsCorruptQuestion, reportBug, mainMenu } = commandPrompts

const parseName = name => {
    return name.split('/')[4].split('.')[0]
};

const parseUser = user => {
    return user.split('/')[3]
};

const parseRepoArray = arr => {
    return {
        Repos: arr.map(r => {
            if (r !== '' && r !== undefined) {
                return { URL: r, Name: parseName(r), GitHubUser: parseUser(r) }
            }
        }).filter(i => i !== undefined)
    }
};

const cloneReposQuestion = async (obj) => {
    let recloneRepos = await (prompts(gitHubCloneRepoQuestion, { onCancel }))
    obj = { Options: { ...obj.Options, [Object.keys(recloneRepos)[0]]: recloneRepos.Reclone } }
    return obj.Options
}

const loadRepos = async (optObj, loadedPrevOpt) => {
    let repoObj;
    if (optObj?.Repos?.length > 0) {
        console.log(optObj.Repos.map(i => i['URL']))
        let loadPrevRepos = await (prompts(gitHubPrevURLQuestion, { onCancel }))
        if (loadPrevRepos.LoadPrev) {
            if (loadedPrevOpt) {
                repoObj = {
                    Repos: optObj['Repos'], Options: { ...optObj.Options }
                }
            } else {
                let tmp = await cloneReposQuestion(optObj)
                repoObj = {
                    Repos: optObj['Repos'], Options: { ...optObj.Options, ...tmp }
                }

            }
        } else {
            tmp = await (prompts(gitHubURLsQuestion, { onCancel }))
            repoObj = {
                ...parseRepoArray(tmp.Repos),
                Options: { ...optObj.Options }
            }
            if (!loadedPrevOpt) {
                let tmp = await cloneReposQuestion(optObj)

                repoObj = {
                    ...repoObj,
                    Options: { ...optObj.Options, ...tmp }
                }
            }
        }
        return repoObj;
    }
    let tmp = await (prompts(gitHubURLsQuestion, { onCancel }))
    let tmpClone = await cloneReposQuestion(optObj)
    repoObj = {
        ...parseRepoArray(tmp['Repos']),
        Options: { ...tmpClone }
    }
    return repoObj;
};

const onCancel = () => {
    process.exit();
}
const prevOptionsCheck = async () => {
    try {
        let tmpLoad = { LoadPrev: false }
        let { LoadPrev } = tmpLoad
        let prevOpts = JSON.parse(fs.readFileSync(`${__dirname}` + '/config.json', 'utf-8'))
        if (Object.keys(prevOpts.Options).length > 0) {
            console.log(prevOpts.Options)
            tmpLoad = await (prompts(loadConfig, { onCancel }))
            let { LoadPrev } = tmpLoad
            return [LoadPrev, prevOpts]
        } else {
            return [LoadPrev, prevOpts]
        }
    } catch (err) {
        // let optCorruptRes = await (prompts(optionsCorruptQuestion))
        console.log('Options file corrupt... Rebuilding')
        fs.unlinkSync(`${__dirname}` + '/config.json')
        return [false, {}]
    };
};

const promise = async (cmd, resMsg, opts = {}, userDir = '') => {
    return new Promise((resolve, reject) => {
        exec(cmd, { ...opts }, (error, stdout, stderr) => {
            if (error) {
                console.log({ error })
                reject();
            } else if (stderr) {
                console.log({ stderr })
                if (stderr.includes('collided')) {
                    let x = await promise(`cd ${userDir} && git config core.ignorecase true`, '')
                    console.log(x);

                }

            } else if (stdout.length > 0) {
                resolve(stdout)
            } else {
                resolve(resMsg);
            }
        });
    });
};

const cloneReposCommand = async ({ user, userDir, URL, repoName }, shell, os) => {
    let gitCloneCommand = fs.existsSync(userDir)
        ?
        `${os === 'win32' ? 'del' : 'rm'} ${userDir} -Force -Recurse  && git config core.ignorecase true --replace-all && git clone ${URL} ${userDir} --quiet`
        :
        `git clone ${URL} ${userDir} --quiet`

    let cloneRes = green('➡️ ') + `Cloning ${user}/${repoName}`
    let cloneCommand = await promise(gitCloneCommand, cloneRes, { shell: shell }, userDir)
    console.log(cloneCommand)
}

const configureOptions = async ({
    optionsObj,
    prevOptions,
}) => {
    let gitHubURLs;
    let loadPrevOptions;
    if (fs.existsSync(`${__dirname}` + '/config.json')) {
        [loadPrevOptions, prevOptions] = await prevOptionsCheck();
        optionsObj = prevOptions;
    }
    // Load Server / Client previous options or not
    if (loadPrevOptions) {
        // Load repos from options or not
        gitHubURLs = await loadRepos(optionsObj, loadPrevOptions);
        optionsObj = gitHubURLs
    } else {
        // Load repos from options or not
        gitHubURLs = await loadRepos(optionsObj, loadPrevOptions);
        const clientOrServerResponse = await (prompts(clientOrServerQuestion, { onCancel }))
        let logResultsRes = await (prompts(logResultsQuestion, { onCancel }))
        let selectedOptions = {
            ...gitHubURLs.Options,
            ...clientOrServerResponse,
            [Object.keys(logResultsRes)[0]]: logResultsRes[Object.keys(logResultsRes)[0]],
        }
        optionsObj = {
            Repos: gitHubURLs.Repos,
            Options: { ...selectedOptions }
        }
    }
    return [optionsObj, loadPrevOptions];
}

const cloneRepos = async ({ optionsObj, repoInfo, shell, os, loadPrevOpts }) => {
    if (optionsObj?.Options?.Reclone && loadPrevOpts) {
        await cloneReposCommand(repoInfo, shell, os)
    } else if (!optionsObj?.Options?.Reclone && !loadPrevOpts) {
        await cloneReposCommand(repoInfo, shell, os)
    } else if (optionsObj?.Options?.Reclone) {
        await cloneReposCommand(repoInfo, shell, os)
    } else if (fs.readdirSync(`${__dirname}/repos`).length <= 1) {
        await cloneReposCommand(repoInfo, shell, os)
    }
}

const commitsCommand = async ({ branchObj, os, userDir }) => {
    let tty = os === 'win32' ? 'CON' : '/dev/tty';
    let commitCommandStr = 'git shortlog -sn < ' + tty
    let commitOpts = { cwd: `${userDir}` }
    let commitCommand = await promise(commitCommandStr, '', commitOpts)

    let commitArr = commitCommand.split("\n").map(i => i.split("\t")).filter(i => i[0] !== '').map(i => [i[0].replace(/\s/g, ''), i[1]])
    commitArr.map(i => {
        branchObj[i[1]] = i[0] + ' commits'
    })
}

const grepCommand = async ({ userDir }) => {
    let grepCommandStr = `cd ${userDir} && git grep -r -n "router" ":!*.json" ":!*.md"`
    let grepCommandRes = await promise(grepCommandStr, '')

    return grepCommandRes.split('\n').filter(i => i[0] === 'c').filter(i => !i.includes('//')).filter(i => i.includes('router.'));
}

const saveResults = ({ results, optionsObj }) => {
    if (Object.keys(results).length === optionsObj.Repos.length) {
        if (optionsObj?.Options?.LogResults) {
            console.dir(results, { depth: null });
        }
        fs.writeFileSync(`${__dirname}/results_${optionsObj.Options.Selection.toLowerCase()}.json`, JSON.stringify(results));
        console.log(green('√ ') + `Results Saved As: ${hyperlinker(green(`results_${optionsObj.Options.Selection.toLowerCase()}.json`), __dirname + `/results_${optionsObj.Options.Selection.toLowerCase()}.json`)}`)

    }
}

const serverCommands = async ({ userDir, user, URL }, results, optionsObj, branchObj) => {
    //*********************************** 
    //? GREP EXPRESS ROUTER ENDPOINTS
    //*********************************** 
    let endpoints = await grepCommand({ userDir }, results);

    //*********************************** 
    //? GREP BCRYPT
    //*********************************** 
    let bcryptCommandStr = `cd ${userDir} && git grep -r -n "bcrypt" ":!*.json" ":!*.md"`
    let bcryptCommandRes = await promise(bcryptCommandStr, '')

    let [bcrypt1, bcrypt2] = bcryptCommandRes.split(" ").filter(i => i !== '').filter(i => i.includes('bcrypt.hash') || i.includes('bcrypt.compare'));

    let fileName = bcryptCommandRes.split(" ").filter(i => i !== '').filter(i => i.includes('controllers')).join('').split('/')[1].split('.')[0].toLowerCase()

    let obj = {
        FileName: fileName,
        Bcrypt: bcrypt1 && bcrypt2 ? true : false
    }

    if (!results[parseUser(URL)]) {
        results[parseUser(URL)] = {
            Files: {}
        }
    }

    endpoints.forEach(async (line) => {

        try {

            // Parse Data
            let fName = line.split('/')[1].split('.')[0].toLowerCase()

            let method = (line.split('/')[1].split('.')[2]).slice(0, -2).toUpperCase()
            let path = line.split("(")[1].split(',')[0].slice(1, -1)
            let filePath = "/" + line.split("/")[0] + "/" + line.split("/")[1].split(":")[0]
            let Async = line.split("(")[1].split(',').filter(i => i.replace(/\s/g, '')).includes(' async ')
            // let Async = line.split("(")[1].split(',')[2] !== undefined ? true : false
            let Validated = line.split("(")[1].split(',').length === 3 ? true : false
            let Bcrypt = fName === obj.FileName && obj.Bcrypt && path === '/register' || path === '/login' ? true : false;

            // console.log(line.split("(")[1].split(','));
            // console.log(validated);

            let tmpOptionsObj = { Validated, Async, Bcrypt }

            Object.keys(tmpOptionsObj).forEach(i => {
                if (!tmpOptionsObj[i]) {
                    delete tmpOptionsObj[i]
                }
            })

            // catCommand = await promise(`cat ${userDir + filePath}`, '', { shell: shell })
            // console.log(catCommand)

            let resObj = {
                Path: path,
                Method: method,
            }
            if (optionsObj.Options.ServerOptions.length > 0) {
                optionsObj.Options.ServerOptions.forEach((i) => {
                    for (let y in i) {
                        if (!resObj[y] || resObj[y] === true) {
                            Object.keys(tmpOptionsObj).forEach(i => {
                                if (i === y) {
                                    resObj[y] = tmpOptionsObj[i]
                                }
                            })
                            if (resObj[y]) {
                                break
                            }
                        }
                    }
                })

            }


            if (!results[user].Files[fName]) {
                results[user].Files[fName] = {
                    Endpoints: [

                    ]
                }
            }

            results[user].Files[fName].Endpoints.push(resObj)

            //Remove Dupes
            let tmp = results[user].Files[fName].Endpoints
            results[user].Files[fName].Endpoints = Array.from(new Set(tmp.map(JSON.stringify))).map((i) => JSON.parse(i));
            let cleaned = results[user].Files[fName].Endpoints

            // Build Final Results Obj
            results[user].Files[fName] = { NumOfEndpoints: cleaned.length, Endpoints: cleaned }
            results[user] = { Branches: branchObj, ...results[user] }
        } catch (err) {
            console.log({ err })
        }
    });
}

const reportBugFetch = async () => {
    let reportBugRes = await (prompts(reportBug, { onCancel }))

    const { BugValue, EmailValue } = reportBugRes;

    axios({
        url: `https://formspree.io/f/${process.env.FORM_ID}`,
        method: 'post',
        headers: {
            'Accept': 'application/json'
        },
        data: {
            email: EmailValue,
            message: BugValue
        }
    }).then((response) => {
        console.log(green('√ ') + 'Sent Successfully');
    }).catch(err => {
        console.log(err);
    })
}

const menuSelectionActions = async (os, shell) => {
    let menuSelectionRes = await (prompts(mainMenu, { onCancel }))

    const { MenuSelection } = menuSelectionRes;

    if (MenuSelection === 'EmptyRepos') {
        const emptyReposCommand = `${os === 'win32' ? 'del' : 'rm'} ${__dirname}/repos/* -Force -Recurse -Exclude *gitkeep* `
        let emptyReposFolder = await promise(emptyReposCommand, 'Cleared Repos Folder', { shell: shell })
        console.log(green('√ ') + emptyReposFolder);
    }

    if (MenuSelection === 'DelConfig') {
        const delConfigCommand = `${os === 'win32' ? 'del' : 'rm'} ${__dirname}/config.json -Force `
        let delConfig = await promise(delConfigCommand, 'Config Deleted', { shell: shell })
        console.log(green('√ ') + delConfig);
    }

    if (MenuSelection === 'Report') {
        await reportBugFetch()
    }
    if (MenuSelection === 'About') {
        console.log(red(`
        Pro_Grader ${version} \n`) +

            '* Currently working on React+TS implementation'
        )
    }



    return MenuSelection
}

//*********************************** 
//? MAIN INITIATION
//*********************************** 
(async () => {
    try {

        let prevOptions = {}, optionsObj = {}, os = process.platform, loadPrevOptions = false
        let shell = os === 'win32' ? 'pwsh.exe' : true


        CFonts.say('Pro_Grader', {
            font: 'tiny',              // define the font face
            align: 'left',              // define text alignment
            colors: ['red'],         // define all colors
            background: 'transparent',  // define the background color, you can also use `backgroundColor` here as key
            letterSpacing: 1,           // define letter spacing
            lineHeight: 1,              // define the line height
            space: true,                // define if the output text should have empty lines on top and on the bottom
            maxLength: '0',             // define how many character can be on one line
            gradient: ['#8b0000', 'red', '#841922'],            // define your two gradient colors
            independentGradient: false, // define if you want to recalculate the gradient for each new line
            transitionGradient: true,  // define if this is a transition between colors directly
            env: 'node'                 // define the environment CFonts is being executed in
        });


        //*********************************** 
        //? MENU OTHER ACTIONS
        //*********************************** 
        const menuChoice = await menuSelectionActions(os, shell)

        if (menuChoice === 'Start') {
            const configOptions = {
                optionsObj,
                prevOptions,
            }
            //*********************************** 
            //? CHECK PREVIOUS CONFIG
            //*********************************** 
            let [gitHubURLs, loadPrevOpts] = await configureOptions(configOptions)
            optionsObj = gitHubURLs
            //*********************************** 
            //? SAVE CONFIG FILE
            //*********************************** 
            if (Object.keys(optionsObj).length !== 0) {
                fs.writeFileSync(`${__dirname}` + "/config.json", JSON.stringify(optionsObj));
                console.log(green('√ ') + `Config Saved As: ${hyperlinker(green('config.json'), __dirname + '/config.json')}`)
            }

            let results = {}
            //*********************************** 
            //? For all of the input Repos
            //*********************************** 
            optionsObj.Repos.forEach(async ({ URL, Name, GitHubUser }) => {
                try {
                    let user = GitHubUser;
                    let userDir = `${__dirname}/repos/${user}`
                    let repoName = Name;
                    let repoInfo = {
                        user,
                        userDir,
                        URL,
                        repoName
                    }
                    let cloneCommandObj = {
                        repoInfo,
                        loadPrevOpts,
                        optionsObj,
                        shell,
                        os
                    }
                    //*********************************** 
                    //? CLONE REPOS
                    //*********************************** 
                    await cloneRepos(cloneCommandObj)
                    //*********************************** 
                    //? If clone was successfull and directories exist
                    //*********************************** 
                    if (fs.existsSync(`${userDir}`)) {
                        //*********************************** 
                        //? GIT BRANCH COMMITS
                        //*********************************** 
                        let branchObj = {}
                        await commitsCommand({ branchObj, os, userDir })
                        if (optionsObj.Options.Selection === 'Server') {
                            //*********************************** 
                            //? RUN SERVER COMMANDS
                            //*********************************** 
                            await serverCommands(repoInfo, results, optionsObj, branchObj);
                        }
                    };
                    //*********************************** 
                    //? SAVE RESULTS FILE
                    //*********************************** 
                    saveResults({ results, optionsObj });
                } catch (err) {
                    console.log({ err });
                };
            });
        }
    } catch (err) {
        console.log({ err });
    };
})();

