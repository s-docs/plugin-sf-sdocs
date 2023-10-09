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
      char: 'i',
      summary: messages.getMessage('flags.inputdir.summary'),
      required: true,
    }),
    name: Flags.directory({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
    }),
    importall: Flags.boolean({
      char: 'a',
      summary: messages.getMessage('flags.importall.summary'),
      default: false,
    }),
  };

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(TemplateImport);

    if (flags.name == null && !flags.importall) {
      this.error('Either --all or --name is required');
    }
    if (flags.name != null && flags.exportall) {
      this.warn(`--all specified. Ignoring --name parameter ${flags.name}`);
    }
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
    /*
    if(flags.exportall){
      const activeTemplates: object[] = await SDocUtils.getAllActiveTemplateData(flags.org.getConnection());
      if(activeTemplates !=null){
        const exportResults = {
          'status':'success',
          'results':[]
        }
        let exportedCount=0;

        this.progress.start(exportedCount, {}, { title: 'Template Export progress' });
        this.progress.setTotal(activeTemplates.length);
        for (const theTemplate of activeTemplates) {
          const templateDirectory = await this.writeTemplateToFile(flags.outputdir,theTemplate,flags);
          exportResults.results.push(templateDirectory);
          exportedCount++;
          this.progress.update(exportedCount);
          
        }
        this.progress.stop();
        this.log('Template export complete');
        return exportResults;
      }else{
        return {
          'status':'failed',
          'message':'No active templates found !!!'
        };
      }
    }*/
  }

  private async importTemplateFromFile(flags: object): Promise<object> {
    const sdocsDir = `${flags.inputdir}${path.sep}sdocs`;
    const orgIdDir = `${sdocsDir}${path.sep}${flags.org.orgId}`;
    const sdocsTemplatesDir = `${orgIdDir}${path.sep}templates`;
    const templateDir = `${sdocsTemplatesDir}${path.sep}${flags.name}`;
    if (!fs.existsSync(templateDir)) {
      this.error(` ${templateDir} not found or doesn't exist`);
    }
    const templateJsonFile = `${templateDir}${path.sep}template.json`;
    if (!fs.existsSync(templateJsonFile)) {
      this.error(` ${templateJsonFile} not found or doesn't exist`);
    } else {
      let theTemplate = JSON.parse(fs.readFileSync(templateJsonFile));
      theTemplate = await SDocUtils.createTemplate(theTemplate, flags.org.getConnection());
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

    this.progress.start(importedFileCount, {}, { title: 'Template files export progress' });
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
