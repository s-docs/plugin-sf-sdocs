/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-await-in-loop */
/* eslint-disable sf-plugin/no-missing-messages */
/* eslint-disable sf-plugin/run-matches-class-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as fs from 'fs';
import * as path from 'path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import SDocUtils from '../../../utils/SDocUtils';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('sdocs', 'sdocs.template.export');

export type CommandResult = {
  status: string;
  message: string;
};

export default class TemplateExport extends SfCommand<CommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    org: Flags.requiredOrg({
      char: 'o',
      summary: messages.getMessage('flags.org.summary'),
      required: true,
    }),
    outputdir: Flags.directory({
      char: 'd',
      summary: messages.getMessage('flags.outputdir.summary'),
      required: true,
    }),
    name: Flags.directory({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
    }),
    exportall: Flags.boolean({
      char: 'a',
      summary: messages.getMessage('flags.exportall.summary'),
      default: false,
    }),
    filters: Flags.directory({
      char: 'f',
      summary: messages.getMessage('flags.filters.summary'),
    })
  };

  public async run(): Promise<CommandResult> {
    const { flags } = await this.parse(TemplateExport);

    if (flags.name == null && !flags.exportall) {
      this.error('Either --all or --name is required');
    }
    if (flags.name != null && flags.exportall) {
      this.warn(`--all specified. Ignoring --name parameter ${flags.name}`);
    }
    this.log(messages.getMessage('info.org-info', [flags.org.getUsername()]));
    if (!flags.exportall && flags.name != null) {
      this.log(messages.getMessage('info.migrate', [flags.name]));
      const theTemplate: object = await SDocUtils.getSingleTemplateData(flags.name, flags.org.getConnection());
      await this.writeTemplateToFile(flags.outputdir, theTemplate, flags);
      return {
        status: 'success',
        message: '',
      };
    }
    if (flags.exportall) {
      const activeTemplates: object[] = await SDocUtils.getAllActiveTemplateData(flags.org.getConnection(), flags.filters);
      if (activeTemplates != null) {
        const exportResults = {
          status: 'success',
          message: '',
        };
        let exportedCount = 0;

        this.progress.start(exportedCount, {}, { title: 'Template Export progress' });
        this.progress.setTotal(activeTemplates.length);
        for (const theTemplate of activeTemplates) {
          const templateDirectory = await this.writeTemplateToFile(flags.outputdir, theTemplate, flags);
          // exportResults.results.push(templateDirectory);
          exportedCount++;
          this.progress.update(exportedCount);
        }
        this.progress.stop();
        this.log('Template export complete');
        return exportResults;
      } else {
        return {
          status: 'failed',
          message: 'No active templates found !!!',
        };
      }
    }
  }

  private async writeTemplateToFile(outputDir: string, theTemplate: object, flags: object): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      // eslint-disable-next-line spaced-comment
      //this.log(`Creating ${outputDir}`);
      fs.mkdirSync(outputDir);
    }

    const sdocsDir = `${outputDir}${path.sep}sdocs`;
    if (!fs.existsSync(sdocsDir)) {
      // this.log(`Creating ${sdocsDir}`);
      fs.mkdirSync(sdocsDir);
    }

    const sdocsTemplatesDir = `${sdocsDir}${path.sep}templates`;
    if (!fs.existsSync(sdocsTemplatesDir)) {
      // this.log(`Creating ${sdocsTemplatesDir}`);
      fs.mkdirSync(sdocsTemplatesDir);
    }

    const templateNameEscaped = theTemplate.Name.replaceAll(path.sep,'_');
    const templateDir = `${sdocsTemplatesDir}${path.sep}${templateNameEscaped}`;
    if (!fs.existsSync(templateDir)) {
      // this.log(`Creating ${templateDir}`);
      fs.mkdirSync(templateDir);
    }
    const templateJsonFile = `${templateDir}${path.sep}template.json`;
    const templateAttachmentJsonFile = `${templateDir}${path.sep}template_files.json`;
    let templateAttachments;

    if (theTemplate.SDOC__Template_Format__c === 'PDF-UPLOAD' || theTemplate.SDOC__Template_Format__c === 'DOCX') {
      templateAttachments = await this.exportAttachmentsForPDFUpload(templateDir, theTemplate, flags);
      if(templateAttachments && templateAttachments.length > 0) {
        fs.writeFileSync(templateAttachmentJsonFile, JSON.stringify(templateAttachments, null, 4));
      }
    }
    delete theTemplate.attributes;
    delete theTemplate.Id;
    fs.writeFileSync(templateJsonFile, JSON.stringify(theTemplate, null, 4));
    // this.log(`Template ${theTemplate.Name} exported to ${templateJsonFile}` );

    return templateDir;
  }

  private async exportAttachmentsForPDFUpload(
    templateDir: string,
    theTemplate: object,
    flags: object
  ): Promise<number> {
    const allAttachments: object[] = await SDocUtils.getAllAttachmentsForTemplate(
      flags.org.getConnection(),
      theTemplate.Id
    );
    const templateFilesDir = `${templateDir}${path.sep}files`;
    if (!fs.existsSync(templateFilesDir)) {
      fs.mkdirSync(templateFilesDir);
    }
    if(allAttachments && allAttachments.length > 0) {
      for (const theAttachment of allAttachments) {
        const attachmentDataFile = `${templateFilesDir}${path.sep}${theAttachment.Name}`;
        const attachmentBase64: Buffer = await SDocUtils.getBodyForAttachment(
          flags.org.getConnection(),
          theAttachment.Body
        );
        fs.writeFileSync(attachmentDataFile, attachmentBase64);
        delete theAttachment.attributes;
        delete theAttachment.Body;
        delete theAttachment.ParentId;
        delete theAttachment.Id;
      }
      return allAttachments;
    }
    
    
  }
}
