#!/usr/bin/env node
const prompts = require('prompts');
const { green } = require('kleur');
const fs = require('fs');

const loadConfig = [
    {
        type: 'toggle',
        name: 'LoadPrev',
        message: 'Previous options config found (options.json). Load it?',
        initial: true,
        active: 'Yes',
        inactive: 'No',
    }
];

const clientOrServerQuestion = [
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

        ],
        instructions: false,
        max: 2,
        hint: '- Space to select. Enter to submit',

    }
];

const gitHubPrevURLQuestion = [
    {
        type: 'toggle',
        name: 'LoadPrev',
        message: 'Use Current Repos in repos config?',
        initial: true,
        active: 'Yes',
        inactive: 'No'
    }
]

const gitHubURLsQuestion = [
    {
        type: 'list',
        name: 'Repos',
        message: `Enter Github Repo URLs Separated By Commas.`,
        initial: '',
        separator: ',',
        validate: value => value.length === 0 ? `URLs cannot be blank!` : true
    },
]


const parseName = name => {
    return name.split('/')[4].split('.')[0]
};

const parseUser = user => {
    return user.split('/')[3]

}

(async () => {
    try {

        let gitHubURLs, prevOptions, optionsObj, loadPrevConfig;

        // If options file exists
        if (fs.existsSync(`${__dirname}` + '/options.json')) {

            try {
                prevOptions = JSON.parse(fs.readFileSync(`${__dirname}` + '/options.json', 'utf-8'))
                if (Object.keys(prevOptions.Options).length !== 0) {
                    console.log(prevOptions.Options)
                    loadPrevConfig = await (prompts(loadConfig))
                }
            } catch (err) {
                console.log('Options file corrupt, please delete it.')
                return
            }
        }

        // Load Server/Client previous options or not
        if (loadPrevConfig?.LoadPrev) {
            optionsObj = prevOptions

            if (prevOptions?.Repos?.length !== 0) {

                loadPrevRepos = await (prompts(gitHubPrevURLQuestion))

                if (loadPrevRepos.LoadPrev) {
                    gitHubURLs = { Repos: prevOptions?.Repos?.map(i => i.URL) }
                } else {
                    gitHubURLs = await (prompts(gitHubURLsQuestion))
                }
            }
        } else {
            // Load repos from options or not
            if (!prevOptions) {
                gitHubURLs = await (prompts(gitHubURLsQuestion))
            }
            else {
                loadPrevRepos = await (prompts(gitHubPrevURLQuestion))
                if (loadPrevRepos?.LoadPrev) {
                    gitHubURLs = { Repos: prevOptions?.Repos?.map(i => i.URL) }
                } else {
                    gitHubURLs = await (prompts(gitHubURLsQuestion))
                }
            }
            const clientOrServerResponse = await (prompts(clientOrServerQuestion))
            optionsObj = {
                Repos: gitHubURLs['Repos']?.map(r => r !== '' ? { URL: r, Name: parseName(r), GitHubUser: parseUser(r) } : null),
                Options: { ...clientOrServerResponse }
            }
        }

        // Save Options File 
        if (optionsObj) {
            fs.writeFileSync(`${__dirname}` + "/options.json", JSON.stringify(optionsObj));
            console.log(green('√ ') + "Options Saved As: options.json")
        }

        let results = {}
        let grepCommand, cloneCommand, commitCommand;

        gitHubURLs.Repos.forEach((r) => {

            let { spawn, exec } = require('child_process')


            cloneCommand = spawn(
                // fs.existsSync(`${__dirname}` + `/repos/${parseUser(r)}`)
                "powershell.exe", [fs.existsSync(`${__dirname}/repos/${parseUser(r)}`)
                    ?
                    `rm ./repos/${parseUser(r)} -Force -Recurse | git clone ${r} ${__dirname}/repos/${parseUser(r)}`
                    :
                    `git clone ${r} ${__dirname}/repos/${parseUser(r)}`]
            );
            // cloneCommand = spawn('powershell.exe', [
            //     // fs.existsSync(`${__dirname}` + `/repos/${parseUser(r)}`)
            //     fs.existsSync(`./repos/${parseUser(r)}`)
            //         ?
            //         ` rm./ repos / ${parseUser(r)} - Force - Recurse | git clone ${r} ./ repos / ${parseUser(r)}`
            //         :
            //         `git clone ${r} ./ repos / ${parseUser(r)}`
            // ]);

            if (fs.existsSync(`${__dirname}` + `/repos/${parseUser(r)}`)) {
                let tty = process.platform === 'win32' ? 'CON' : '/dev/tty';

                let branchObj = {}

                commitCommand = exec('git shortlog -sn < ' + tty, { cwd: `./ repos / ${parseUser(r)}` }, function (error, stdout, stderr) {

                })
                commitCommand.stdout.on("data", (data) => {
                    let commitArr = data.split("\n").map(i => i.split("\t")).filter(i => i[0] !== '').map(i => [i[0].replace(/\s/g, ''), i[1]])
                    // branchObj[commitArr[0]] = commitArr[1] + ' commits'
                    commitArr.map(i => {
                        branchObj[i[1]] = i[0] + ' commits'
                    })

                })

                grepCommand = exec(`cd ${__dirname}/repos/${parseUser(r)} && git grep -r "router" ":!*.json" ":!*.md"`)
                grepCommand.stdout.on("data", (data) => {

                    let endpoints = data.split('\n').filter(i => i[0] === 'c').filter(i => !i.includes('//')).filter(i => i.includes('router.'))

                    if (!results[parseUser(r)]) {
                        results[parseUser(r)] = {
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

                        if (!results[parseUser(r)].Files[fName]) {
                            results[parseUser(r)].Files[fName] = {
                                Endpoints: [

                                ]
                            }
                        }

                        results[parseUser(r)].Files[fName].Endpoints.push(resObj)

                        //Remove Dupes
                        let tmp = results[parseUser(r)].Files[fName].Endpoints
                        results[parseUser(r)].Files[fName].Endpoints = Array.from(new Set(tmp.map(JSON.stringify))).map((i) => JSON.parse(i));
                        let cleaned = results[parseUser(r)].Files[fName].Endpoints

                        // Build Final Results Obj
                        results[parseUser(r)].Files[fName] = { NumOfEndpoints: cleaned.length, Endpoints: cleaned }
                        results[parseUser(r)] = { Branches: branchObj, ...results[parseUser(r)] }

                    })
                }
                )
            }
            grepCommand?.stderr.on("data", function (data) {
                console.log("Status: " + data);
            });
            commitCommand?.stderr.on("data", function (data) {
                console.log("Status: " + data);
            });
            cloneCommand?.on("exit", function () {
                // console.log(`Repos Cloned Successfully`);
            });
            cloneCommand?.stderr.on("data", function (data) {
                // console.log(`clone ${data}`);
            });

        })
        console.log(green('√ ') + 'Results Saved As: results.json')

        grepCommand?.on("exit", function () {

            fs.writeFileSync(`${__dirname}` + "/results.json", JSON.stringify(results));
        });
        commitCommand?.on("exit", function () {
        });
    } catch (err) {
        console.log(err)
    }
})();

