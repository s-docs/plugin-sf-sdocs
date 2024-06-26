# summary

Export S-Docs template from an salesforce org

# description

Export S-Docs template from an salesforce org

# flags.org.summary

The org alias that you want to export the template from

# flags.outputdir.summary

The directory where the templates will be exported

# flags.name.summary

The name of the template to be exported. Should be the value of the `Name` field on the `SDOC___SDTemplate__c` object

# flags.exportall.summary

A flag that tells the plugin if you want to export all active templates. Default is `false`

# flags.filters.summary

Specify any fitlers when extracting templates. This is the `WHERE` clause for the extraction

# examples

- Export a template named `NDA 2023` from a sandbox to the `templates` output directory

  <%= config.bin %> <%= command.id %> -u my_dev_sandbox -o ./templates -n "NDA 2023"

- Export all templates from `my_dev_sandbox`

  <%= config.bin %> <%= command.id %> -u my_dev_sandbox -o ./templates --exportall

# info.migrate

Exporting SDocs Template : %s

# info.org-info

Migrating from Org with username : %s
