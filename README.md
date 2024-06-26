# sdocs

### Installation

1. Clone this plugin repository

```
git clone https://github.com/s-docs/plugin-sf-sdocs
```

2. Build the plugin using the below command

```
npm install
```

3. In the directory where you cloned the repo execute the following:

```
sf plugins link .
```

If the above step is successful, then the plugin was linked in your local environment successfully.

### Testing the plugin

To ensure the plugin in linked correctly, run the following command:

```
sf sdocs template export --help
```

This should print something like below:

```
Export S-Docs template from an salesforce org

USAGE
  $ sf sdocs template export -o <value> -d <value> [--json] [-n <value>] [-a]

FLAGS
  -a, --exportall          A flag that tells the plugin if you want to export all active templates. Default is `false`
  -d, --outputdir=<value>  (required) The directory where the templates will be exported
  -f, --filters=<value>    Specify any fitlers when extracting templates. This is the `WHERE` clause for the extraction
  -n, --name=<value>       The name of the template to be exported. Should be the value of the `Name` field on the `SDOC___SDTemplate__c` object
  -o, --org=<value>        (required) The org alias that you want to export the template from

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Export S-Docs template from an salesforce org

  Export S-Docs template from an salesforce org

EXAMPLES
  Export a template named `NDA 2023` from a sandbox to the `templates` output directory

    $ sf sdocs template export -u my_dev_sandbox -o ./templates -n "NDA 2023"

  Export all templates from `my_dev_sandbox`

    $ sf sdocs template export -u my_dev_sandbox -o ./templates --exportall
```

## Commands available in SDocs CLI

### `export`

This exports a given template or all templates to the file system that can be then imported into another org or environment. See the examples show when you do `sf sdocs template export --help` for more specifics

### `import`

This exports a given template from the file system into another org or environment. See the examples show when you do `sf sdocs template import --help` for more specifics
