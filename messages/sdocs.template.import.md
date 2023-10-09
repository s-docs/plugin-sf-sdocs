# summary

Export S-Docs template from an salesforce org

# description

Export S-Docs template from an salesforce org

# flags.org.summary

The org alias that you want to export the template from

# flags.inputdir.summary

The directory where the templates will be imported from

# flags.name.summary

The name of the template to be exported. Should be the value of the `Name` field on the `SDOC___SDTemplate__c` object

# flags.importall.summary

A flag that tells the plugin if you want to import all templates in the `inputdir` directory

# examples

- Import a template named `NDA 2023` to the `my_dev_sandbox` sandbox from the `templates` input directory

  <%= config.bin %> <%= command.id %> -u my_dev_sandbox -i ./templates -n "NDA 2023"

# info.migrate

Importing SDocs Template : %s

# info.org-info

Migrating from Org with username : %s
