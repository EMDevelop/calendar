// Plain .mjs on purpose: this has to run on the wrong Node version to be able
// to complain about it (docs/spec.md §11).

const REQUIRED_MAJOR = 24
const actual = process.versions.node
const major = Number(actual.split('.')[0])

if (Number.isNaN(major) || major < REQUIRED_MAJOR) {
  process.stderr.write(
    [
      '',
      `This project needs Node ${REQUIRED_MAJOR}; you are running ${actual}.`,
      '',
      'Node 20 reached end of life in April 2026 and cannot run the .ts scripts',
      'in this repo. Workbrew installed the right version already, so put it in',
      'front of nvm for this shell:',
      '',
      '  export PATH="/opt/homebrew/opt/node@24/bin:$PATH"',
      '',
      'To make it stick for this project only, add that line to a .envrc, or run',
      '`nvm deactivate` before working here. Adding it to ~/.zshrc would override',
      'nvm everywhere, which may not be what you want for other projects.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}
