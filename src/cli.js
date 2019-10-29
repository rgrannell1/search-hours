
const doc = `
Usage:
  script render --path <path>
  script show-spec --path <path>

Options:
  --path <path>    the google browser history.
`

const { docopt } = require('docopt')
const app = require('./app')

const args = docopt(doc)

app(args)
