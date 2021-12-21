const prompts = require('prompts');
const { bold, green } = require('kleur');
const fs = require('fs');

const loadConfig = [
    {
        type: 'toggle',
        name: 'LoadPrev',
        message: 'Previous options config found (options.json). Load it?',
        initial: false,
        active: 'Yes',
        inactive: 'No'
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
            { title: 'Auth', value: { Auth: true }, description: 'Register/Login', selected: true },
            { title: 'TokenValidation', value: { TokenVal: true }, description: 'Validate-JWT - Check for token, block requests without. ', selected: true },
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
        initial: false,
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
        if (fs.existsSync(`./options.json`)) {
            prevOptions = JSON.parse(fs.readFileSync('./options.json', 'utf-8'))
            if (Object.keys(prevOptions.Options).length !== 0) {
                console.log(prevOptions.Options)
                loadPrevConfig = await (prompts(loadConfig))
            }
        }

        // Load Server/Client previous options or not
        if (loadPrevConfig?.LoadPrev) {
            optionsObj = prevOptions
            if (fs.readdirSync('./repos').length !== 0 && prevOptions.Repos.length !== 0) {

                loadPrevRepos = await (prompts(gitHubPrevURLQuestion))

                if (loadPrevRepos.LoadPrev) {
                    gitHubURLs = { Repos: prevOptions?.Repos?.map(i => i.URL) }
                } else {
                    gitHubURLs = await (prompts(gitHubURLsQuestion))
                }
            }
        } else {
            // Load repos from options or not
            if (fs.readdirSync('./repos')?.length !== 0 && prevOptions.Repos) {

                loadPrevRepos = await (prompts(gitHubPrevURLQuestion))

                if (loadPrevRepos.LoadPrev) {
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
        fs.writeFileSync("./options.json", JSON.stringify(optionsObj));

        console.log(green('√ ') + "Options Saved As: options.json")

        let results = {}
        let grepCommand;
        let cloneCommand;

        gitHubURLs?.Repos?.forEach((r) => {

            let { spawn, exec } = require('child_process')

            cloneCommand = spawn('powershell.exe', [fs.existsSync(`./repos/${parseUser(r)}`) ? ` rm ./repos/${parseUser(r)} -Force -Recurse | git clone ${r} ./repos/${parseUser(r)}` : `git clone ${r} ./repos/${parseUser(r)}`]);

            if (fs.existsSync(`./repos/${parseUser(r)}`)) {

                grepCommand = exec(`cd ./repos/${parseUser(r)} && git grep -r "router" ":!*.json" ":!*.md"`)
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

                        // Endpoint Obj
                        let resObj = {
                            Path: path,
                            Method: method,
                            Validated: validated,
                            Async: async
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

                    })
                }
                )
            }
            grepCommand?.stderr.on("data", function (data) {
                console.log("Status: " + data);
            });
        })
        console.log(green('√ ') + 'Results Saved As: results.json')
        cloneCommand?.on("exit", function () {
            // console.log(`${parseName(r)} Cloned Successfully`);
            // console.log(`Repos Cloned Successfully`);
        });

        grepCommand?.on("exit", function () {
            // console.dir(results, { depth: null, colors: true, breakLength: 150 })
            fs.writeFileSync("./results.json", JSON.stringify(results));
            // console.log(green('Results Saved As: results.json'))
        });
    } catch (err) {
        console.log(err)
    }
})();


// git shortlog -s -n
// see all commits

