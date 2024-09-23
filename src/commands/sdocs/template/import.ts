/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-await-in-loop */
/* eslint-disable sf-plugin/no-missing-messages */
/* eslint-disable sf-plugin/run-matches-class-type */
/* tslint:disable */
import * as fs from 'fs';
import * as path from 'path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import SDocUtils from '../../../utils/SDocUtils';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('sdocs', 'sdocs.template.import');

export default class TemplateImport extends SfCommand<object> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    org: Flags.requiredOrg({
      char: 'o',
      summary: messages.getMessage('flags.org.summary'),
      required: true,
    }),
    inputdir: Flags.directory({
      char: 'd',
      summary: messages.getMessage('flags.inputdir.summary'),
      required: true,
    }),
    name: Flags.directory({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      required: false,
    }),
    externalid: Flags.directory({
      char: 'e',
      summary: messages.getMessage('flags.externalid.summary'),
      required: false,
    }),
    importall: Flags.boolean({
      char: 'i',
      summary: messages.getMessage('flags.importall.summary'),
      required: false,
    }),
  };

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(TemplateImport);

    this.log(messages.getMessage('info.org-info', [flags.org.getUsername()]));
    if (!flags.importall && flags.name != null) {
      this.log(messages.getMessage('info.migrate', [flags.name]));

      const templateImport = await this.importTemplateFromFile(flags);
      return {
        status: 'success',
        results: {
          template: templateImport,
        },
      };
    }

    if (flags.importall){
      await this.importAllTemplatesFromDirectory(flags);
    }
  }

  private async importAllTemplatesFromDirectory(flags: object): Promise<object> {
    const sdocsDir = `${flags.inputdir}${path.sep}sdocs`;
    const sdocsTemplatesDir = `${sdocsDir}${path.sep}templates`;
    this.log(`Importing all templates from ${sdocsTemplatesDir}`);
   
    let templatesToMigrate = await fs.readdirSync(sdocsTemplatesDir);
    for(let i=0;i<templatesToMigrate.length;i++){
      let templateDir = `${sdocsTemplatesDir}${path.sep}${templatesToMigrate[i]}`;
      this.log(`Importing template: ${templatesToMigrate[i]} from ${templateDir}`); 
      const externalId = flags.externalid;
      if (!fs.existsSync(templateDir)) {
        this.error(` ${templateDir} not found or doesn't exist`);
      }
      const templateJsonFile = `${templateDir}${path.sep}template.json`;
      if (!fs.existsSync(templateJsonFile)) {
        this.error(` ${templateJsonFile} not found or doesn't exist`);
      } else {
        let theTemplate = JSON.parse(fs.readFileSync(templateJsonFile));
        theTemplate = await SDocUtils.createTemplate(theTemplate, flags.org.getConnection(), flags.externalid);
        if (theTemplate.SDOC__Template_Format__c === 'PDF-UPLOAD' || theTemplate.SDOC__Template_Format__c === 'DOCX') {
          await this.importAttachmentsForPDFUpload(templateDir, theTemplate, flags);
        }
      }        
    }
  }
  private async importTemplateFromFile(flags: object): Promise<object> {
    const sdocsDir = `${flags.inputdir}${path.sep}sdocs`;
    const sdocsTemplatesDir = `${sdocsDir}${path.sep}templates`;
    const templateDir = `${sdocsTemplatesDir}${path.sep}${flags.name}`;
    const externalId = flags.externalid;
    if (!fs.existsSync(templateDir)) {
      this.error(` ${templateDir} not found or doesn't exist`);
    }
    const templateJsonFile = `${templateDir}${path.sep}template.json`;
    if (!fs.existsSync(templateJsonFile)) {
      this.error(` ${templateJsonFile} not found or doesn't exist`);
    } else {
      let theTemplate = JSON.parse(fs.readFileSync(templateJsonFile));
      theTemplate = await SDocUtils.createTemplate(theTemplate, flags.org.getConnection(), flags.externalid);
      if (theTemplate.SDOC__Template_Format__c === 'PDF-UPLOAD' || theTemplate.SDOC__Template_Format__c === 'DOCX') {
        await this.importAttachmentsForPDFUpload(templateDir, theTemplate, flags);
      }
      return theTemplate;
    }
  }

  private async importAttachmentsForPDFUpload(
    templateDir: string,
    theTemplate: object,
    flags: object
  ): Promise<number> {
    const templateFilesDir = `${templateDir}${path.sep}files`;
    const templateAttachmentJsonFile = `${templateDir}${path.sep}template_files.json`;
    if (!fs.existsSync(templateAttachmentJsonFile)) {
      this.error(`File JSON file ${templateAttachmentJsonFile} not found. Export your template again.`);
    }
    const allAttachments: object[] = JSON.parse(fs.readFileSync(templateAttachmentJsonFile));
    if (!fs.existsSync(templateFilesDir)) {
      this.error(` Directory for Template files ${templateFilesDir} not found. Export your template again.`);
    }
    let importedFileCount = 0;

    this.progress.start(importedFileCount, {}, { title: 'Template files import progress' });
    this.progress.setTotal(allAttachments.length);

    for (const theAttachment of allAttachments) {
      const attachmentDataFile = `${templateFilesDir}${path.sep}${theAttachment.Name}`;
      const base64Body = fs.readFileSync(attachmentDataFile).toString('base64');
      theAttachment.Body = base64Body;
      theAttachment.ParentId = theTemplate.Id;
      await SDocUtils.createAttachmentForTemplate(theAttachment, flags.org.getConnection());
      // this.log(`Uploaded attachment : ${theAttachment.Name} to ${theTemplate.Name}`);
      this.progress.update(++importedFileCount);
    }
    this.progress.stop();
    return allAttachments.length;
  }
}
