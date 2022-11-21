import * as shelljs from 'shelljs'
import * as pkg from '../package.json'
import yoda from '../src/lib/yoda'
import * as git from '../src/lib/git'

// const SILENT is true if process.env.SILENT is undefined or 'true'
const SILENT = process.env.SILENT === undefined || process.env.SILENT === 'true'

describe('Prepare test environemnt', () => {
  const testBranch = 'testBranch'
  let currentBranch: string

  beforeAll(() => {
    currentBranch = git.getCurrentBranch()
    git.createBranch(testBranch)
  })

  it('checks test branch exists', () => {
    expect(git.branchExists(testBranch)).toBe(true)
  })

  describe('Program transpiled correctly', () => {
    it('is transpiled', () => {
      expect(shelljs.test('-e', 'bin/cli')).toBe(true)
    })

    it('returns the version', () => {
      const shellString = shelljs.exec('node bin/cli -V', {
        silent: SILENT,
      })

      expect(shellString.stdout).toMatch(pkg.version)
    })
  })

  describe('Init command', () => {
    beforeAll(() => {
      if (shelljs.test('-e', '.git-oneflowrc')) shelljs.rm('.git-oneflowrc')
    })

    it('creates default config file', () => {
      const shellString = shelljs.exec('node bin/cli init -y', {
        silent: SILENT,
      })

      expect(shellString.stdout).toContain(
        'config: new configuration file created'
      )
      expect(shelljs.test('-e', '.git-oneflowrc')).toBe(true)
    })

    it('refuses to create a config file', () => {
      const shellString = shelljs.exec('node bin/cli init -y', {
        silent: SILENT,
      })

      expect(shellString.stderr).toContain('warning: a configuration exists')
    })

    it('summons yoda', () => {
      const shellString = shelljs.exec('node bin/cli init -y -f', {
        silent: SILENT,
      })

      expect(shellString.stdout).toContain(yoda)
    })

    afterAll(() => {
      shelljs.rm('.git-oneflowrc')
    })
  })

  describe('Start/Finish commands', () => {
    const featureName = 'my-feature'
    const releaseName = 'my-release'
    const hotfixName = 'my-hotfix'

    it('shows default help', () => {
      const shellString = shelljs.exec('node bin/cli start', {
        silent: SILENT,
      })

      expect(shellString.stderr).toContain('Usage: git-oneflow start|s')
    })

    it('shows help on demand', () => {
      const shellString = shelljs.exec('node bin/cli start -h', {
        silent: SILENT,
      })

      expect(shellString.stdout).toContain('Usage: git-oneflow start|s')
    })

    it('shows suggestion if command is mistyped', () => {
      const shellString = shelljs.exec('node bin/cli strat', {
        silent: SILENT,
      })

      expect(shellString.stderr).toContain('(Did you mean start?)')
    })

    it('starts a feature', () => {
      const shellString = shelljs.exec(
        `node bin/cli s f -r ${testBranch} ${featureName}`,
        {
          silent: SILENT,
        }
      )

      if (process.env.GOF_DRY_RUN)
        expect(shellString.stdout).toMatch(
          'dry-run: git checkout -b feature/my-feature testBranch'
        )
      else {
        expect(git.getCurrentBranch()).toMatch(`feature/${featureName}`)
      }
    })

    it('finishes a feature', () => {
      const shellString = shelljs.exec(
        `node bin/cli f f -o ${testBranch} ${featureName} --no-delete --no-interactive --no-push`,
        {
          silent: SILENT,
        }
      )

      if (process.env.GOF_DRY_RUN)
        expect(shellString.stdout).toMatch(
          'dry-run: git checkout feature/my-feature' +
            '\n' +
            'dry-run: git rebase testBranch' +
            '\n' +
            'dry-run: git checkout testBranch' +
            '\n' +
            'dry-run: git merge --ff-only feature/my-feature'
        )
      else {
        expect(git.branchExists(`feature/${featureName}`)).toBe(true)
        expect(git.getCurrentBranch()).toMatch(testBranch)
        git.deleteBranch(`feature/${featureName}`)
      }
    })

    it('fails to start a feature', () => {
      const noBranch = 'no-branch'
      const shellString = shelljs.exec(
        `node bin/cli s f ${featureName} -r ${noBranch}`
      )

      if (process.env.GOF_DRY_RUN)
        expect(shellString.stdout).toMatch(
          `dry-run: git checkout -b feature/${featureName} ${noBranch}`
        )
      else
        expect(shellString.stderr).toMatch(
          `error: fatal: '${noBranch}' is not a commit and a branch 'feature/${featureName}' cannot be created from it`
        )
    })

    it('starts a release', () => {
      const shellString = shelljs.exec(
        `node bin/cli s r -r ${testBranch} ${releaseName}`,
        {
          silent: SILENT,
        }
      )

      if (process.env.GOF_DRY_RUN)
        expect(shellString.stdout).toMatch(
          'dry-run: git checkout -b release/my-release testBranch'
        )
      else {
        expect(git.getCurrentBranch()).toMatch(`release/${releaseName}`)
      }
    })

    it('finishes a release', () => {
      const tag = '41.41.41'
      const shellString = shelljs.exec(
        `node bin/cli f r -o ${testBranch} ${releaseName} --no-delete --no-push -t ${tag} -m 'chore(release) ${tag}'`,
        {
          silent: SILENT,
        }
      )

      if (process.env.GOF_DRY_RUN)
        expect(shellString.stdout).toMatch(
          'dry-run: git checkout release/my-release' +
            '\n' +
            `dry-run: git tag -a -m 'chore(release) ${tag}' ${tag}` +
            '\n' +
            'dry-run: git checkout testBranch' +
            '\n' +
            'dry-run: git merge release/my-release'
        )
      else {
        expect(git.branchExists(`release/${releaseName}`)).toBe(true)
        expect(git.getCurrentBranch()).toMatch(testBranch)
        expect(git.getLatestTag()).toMatch(tag)
        shelljs.exec(`git tag -d ${tag}`)
        git.deleteBranch(`release/${releaseName}`)
      }
    })

    it('starts a hotfix', () => {
      const shellString = shelljs.exec(
        `node bin/cli s h -r ${testBranch} ${hotfixName}`,
        {
          silent: SILENT,
        }
      )

      if (process.env.GOF_DRY_RUN)
        expect(shellString.stdout).toMatch(
          'dry-run: git checkout -b hotfix/my-hotfix testBranch'
        )
      else {
        expect(git.getCurrentBranch()).toMatch(`hotfix/${hotfixName}`)
      }
    })

    it('finishes a hotfix', () => {
      const tag = '42.42.42'
      const shellString = shelljs.exec(
        `node bin/cli f h -o ${testBranch} ${hotfixName} --no-delete --no-push -t ${tag} -m 'chore(release) ${tag}'`,
        {
          silent: SILENT,
        }
      )

      if (process.env.GOF_DRY_RUN)
        expect(shellString.stdout).toMatch(
          'dry-run: git checkout hotfix/my-hotfix' +
            '\n' +
            `dry-run: git tag -a -m 'chore(release) ${tag}' ${tag}` +
            '\n' +
            'dry-run: git checkout testBranch' +
            '\n' +
            'dry-run: git merge hotfix/my-hotfix'
        )
      else {
        expect(git.branchExists(`hotfix/${hotfixName}`)).toBe(true)
        expect(git.getCurrentBranch()).toMatch(testBranch)
        expect(git.getLatestTag()).toMatch(tag)
        shelljs.exec(`git tag -d ${tag}`)
        git.deleteBranch(`hotfix/${hotfixName}`)
      }
    })
  })

  afterAll(() => {
    git.checkoutBranch(currentBranch)
    git.deleteBranch(testBranch)
  })
})
