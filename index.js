#!/usr/bin/env node
const prompts = require('prompts');
const path = require('path');
const { green } = require('kleur');
const { spawn, exec } = require('child_process')
const fs = require('fs');
const hyperlinker = require('hyperlinker');


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
TODO: - Add toggle for cloning choice

*/

const commandPrompts = {
    loadConfig: [
        {
            type: 'toggle',
            name: 'LoadPrev',
            message: 'Previous options config found (options.json). Load it?',
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

                { title: 'Validated', value: { TokenVal: true }, description: 'Check for token on endpoint ', selected: true },
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
            message: 'Re-clone repos?',
            initial: true,
            active: 'Yes',
            inactive: 'No'
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

const { loadConfig, clientOrServerQuestion, logResultsQuestion, gitHubPrevURLQuestion, gitHubCloneRepoQuestion, gitHubURLsQuestion, optionsCorruptQuestion } = commandPrompts

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

const cloneRepos = async (obj) => {

    let recloneRepos = await (prompts(gitHubCloneRepoQuestion))
    if (recloneRepos.Reclone) {
        obj = { Options: { [Object.keys(recloneRepos)[0]]: recloneRepos[Object.keys(recloneRepos)[0]], ...obj.Options } }
    }

    return obj.Options
}

const loadRepos = async (optObj) => {
    if (optObj?.Repos?.length > 0) {
        console.log(optObj.Repos.map(i => i['URL']))
        let loadPrevRepos = await (prompts(gitHubPrevURLQuestion))
        let repoObj;
        if (loadPrevRepos.LoadPrev) {
            if (!optObj.Options.Reclone) {

                let tmp = await cloneRepos(optObj)
                repoObj = {
                    Repos: optObj['Repos'], Options: { ...optObj.Options, ...tmp }
                }
                console.log({ repoObj })
            }
        } else {
            tmp = await (prompts(gitHubURLsQuestion))
            repoObj = parseRepoArray(tmp.Repos)
        }
        return repoObj;
    }
    tmp = await (prompts(gitHubURLsQuestion))
    repoObj = parseRepoArray(tmp.Repos)
    return repoObj;

};

const prevOptionsCheck = async () => {
    try {
        let tmpLoad = { LoadPrev: false }
        let { LoadPrev } = tmpLoad
        let prevOpts = JSON.parse(fs.readFileSync(`${__dirname}` + '/config.json', 'utf-8'))
        if (Object.keys(prevOpts.Options).length > 0) {
            console.log(prevOpts.Options)
            tmpLoad = await (prompts(loadConfig))
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

async function promise(cmd, resMsg, opts = {}) {
    return new Promise((resolve, reject) => {
        exec(cmd, { ...opts }, (error, stdout, stderr) => {
            if (error) {
                console.log({ error })
                reject();
            } else if (stderr) {
                console.log({ stderr })
            } else if (stdout.length > 0) {
                resolve(stdout)
            } else {
                resolve(resMsg);
            }
        });
    });
};

(async () => {
    try {
        let gitHubURLs, prevOptions = {}, optionsObj = {}, loadPrevOptions, os = process.platform
        let shell = os === 'win32' ? 'pwsh.exe' : true
        if (os === 'win32') {
            exec(`git config core.ignorecase true`, '')
        }
        // If options file exists
        if (fs.existsSync(`${__dirname}` + '/config.json')) {
            [loadPrevOptions, prevOptions] = await prevOptionsCheck();
            optionsObj = prevOptions;
        }
        // Load Server / Client previous options or not
        if (loadPrevOptions) {
            // Load repos from options or not
            gitHubURLs = await loadRepos(optionsObj);
            console.log({ gitHubURLs })
            console.log("load prev", gitHubURLs)
            optionsObj = gitHubURLs

        } else {
            // Load repos from options or not
            gitHubURLs = await loadRepos(optionsObj);
            console.log("new options", gitHubURLs)
            const clientOrServerResponse = await (prompts(clientOrServerQuestion))
            let logResultsRes = await (prompts(logResultsQuestion))

            let selectedOptions = {
                ...clientOrServerResponse,
                [Object.keys(logResultsRes)[0]]: logResultsRes[Object.keys(logResultsRes)[0]],
                ...gitHubURLs.Options
            }

            optionsObj = {
                Repos: gitHubURLs.Repos,
                Options: { ...selectedOptions }
            }
        }

        // Save Options File 
        if (Object.keys(optionsObj).length !== 0) {
            console.log(optionsObj)
            fs.writeFileSync(`${__dirname}` + "/config.json", JSON.stringify(optionsObj));
            console.log(green('√ ') + `Config Saved As: ${hyperlinker(green('config.json'), __dirname + '/config.json')}`)
        }

        let results = {}

        gitHubURLs.Repos.forEach(async ({ URL, Name, GitHubUser }) => {
            try {

                // Clone down repos
                let user = GitHubUser
                let repoName = Name
                let userDir = `${__dirname}/repos/${user}`
                let gitCloneCommand = fs.existsSync(userDir)
                    ?
                    `${os === 'win32' ? 'del' : 'rm'} ${userDir} -Force -Recurse && git clone  ${URL} ${userDir} --quiet`
                    :
                    `git clone ${URL} ${userDir} --quiet`



                let cloneRes = green('➡️ ') + `Cloning ${user}/${repoName}`
                let cloneCommand = await promise(gitCloneCommand, cloneRes, { shell: shell })
                console.log(cloneCommand)

                // If directory exists/after clone, run commands -> commitCount/grep/Bcrypt
                if (fs.existsSync(`${userDir}`)) {
                    let tty = os === 'win32' ? 'CON' : '/dev/tty';
                    let commitCommandStr = 'git shortlog -sn < ' + tty
                    let commitOpts = { cwd: `${userDir}` }
                    let branchObj = {}
                    let commitCommand = await promise(commitCommandStr, '', commitOpts)

                    let commitArr = commitCommand.split("\n").map(i => i.split("\t")).filter(i => i[0] !== '').map(i => [i[0].replace(/\s/g, ''), i[1]])
                    commitArr.map(i => {
                        branchObj[i[1]] = i[0] + ' commits'
                    })

                    let grepCommandStr = `cd ${userDir} && git grep -r "router" ":!*.json" ":!*.md"`
                    grepCommand = await promise(grepCommandStr, '')

                    let endpoints = grepCommand.split('\n').filter(i => i[0] === 'c').filter(i => !i.includes('//')).filter(i => i.includes('router.'))

                    if (!results[parseUser(URL)]) {
                        results[parseUser(URL)] = {
                            Files: {}
                        }
                    }

                    endpoints.forEach((line) => {
                        // Parse Data
                        let fName = line.split('/')[1].split('.')[0].toLowerCase()
                        let method = (line.split('/')[1].split('.')[2]).slice(0, -2).toUpperCase()
                        let path = line.split("(")[1].split(',')[0].slice(1, -1)

                        let async = line.split("(")[1].split(',')[2] !== undefined ? true : false
                        let validated = line.split("(")[1].split(',').length === 3 ? true : false

                        let tmpOptionsObj = { async, validated }

                        // Endpoint Obj
                        let resObj = {
                            Path: path,
                            Method: method,
                        }
                        if (optionsObj.Options.ServerOptions.length > 0) {
                            optionsObj.Options.ServerOptions.forEach((i) => {
                                for (y in i) {
                                    if (!resObj[y] || resObj[y] === true) {
                                        Object.keys(tmpOptionsObj).forEach(i => {
                                            resObj[y] = tmpOptionsObj[i]
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

                    });

                };
                if (Object.keys(results).length === gitHubURLs.Repos.length) {
                    if (optionsObj.Options.LogResults) {
                        console.dir(results, { depth: null });
                    }
                    fs.writeFileSync("./results.json", JSON.stringify(results));
                    console.log(green('√ ') + `Results Saved As: ${hyperlinker(green('results.json'), __dirname + '/results.json')}`)
                    console.log(path.join(__dirname, 'config.json'))
                }
            } catch (err) {
                console.log({ err });
            };
        });

    } catch (err) {
        console.log({ err });
    };
})();

