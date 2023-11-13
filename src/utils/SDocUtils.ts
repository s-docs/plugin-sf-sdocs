/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
/* tslint:disable */
import { Connection } from '@salesforce/core';
import got from 'got';
export default class SDocUtils {
  public static async getSingleTemplateData(name: string, connection: Connection): Promise<object> {
    let queryToExecute: string = await this.getSoqlQuery(connection);
    queryToExecute += " where Name = '" + name + "'";
    const theTemplate: unknown = await connection.singleRecordQuery(queryToExecute);
    if (theTemplate != null) {
      return theTemplate;
    } else {
      console.log(` Template ${name} not found !!!!`);
      return null;
    }
  }

  public static async getAllActiveTemplateData(connection: Connection): Promise<object> {
    let queryToExecute: string = await this.getSoqlQuery(connection);
    queryToExecute += ' where SDOC__Active__c = true';
    const queryResult: object = await connection.query(queryToExecute);
    if (queryResult.done != null && queryResult.totalSize > 0) {
      return queryResult.records;
    } else {
      console.log('No active SDoc templates found');
      return null;
    }
  }

  public static async getAllAttachmentsForTemplate(connection: Connection, templateId: string): Promise<object> {
    const queryToExecute: string =
      'SELECT Body,Description,Id,Name,ParentId' + ` FROM Attachment where parentId='${templateId}'`;

    const queryResult: object = await connection.query(queryToExecute);
    if (queryResult.done != null && queryResult.totalSize > 0) {
      return queryResult.records;
    } else {
      console.log(`No attachments found for ${templateId}`);
      return null;
    }
  }

  public static async getBodyForAttachment(connection: Connection, bodyUrl: string): Promise<Buffer> {
    const bodyResponse = await got({
      url: `${connection.instanceUrl}${bodyUrl}`,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
    });
    if (bodyResponse.statusCode === 200) {
      return bodyResponse.rawBody;
    } else {
      return null;
    }
  }

  public static async createTemplate(theTemplate: object, connection: Connection, externalId: string): Promise<object> {
    theTemplate.Id = null;
    let dmlResult;
    console.log('SDOCUtils.createTemplate : externalId = ' + externalId);
    if (externalId == null) {
      dmlResult = await connection.insert('SDOC__SDTemplate__c', theTemplate);
    } else {
      dmlResult = await connection.upsert('SDOC__SDTemplate__c', theTemplate, externalId);
    }
    if (dmlResult.success) {
      theTemplate.Id = dmlResult.id;
    }
    return theTemplate;
  }

  public static async createAttachmentForTemplate(theAttachment: object, connection: Connection): Promise<object> {
    const insertResult = await connection.insert('Attachment', theAttachment);
    if (insertResult.success) {
      theAttachment.Id = theAttachment.id;
    }
    return theAttachment;
  }

  private static async getSoqlQuery(connection: Connection): Promise<string> {
    const templateObjDescribe = await connection.describe('SDOC__SDTemplate__c');
    const objFields = templateObjDescribe.fields;
    const writeableCustomFields = objFields.filter((fld) => fld.createable && fld.custom);
    const writeableFieldsNames = writeableCustomFields.map((fld) => fld.name);
    writeableFieldsNames.push('Name');
    writeableFieldsNames.push('Id');
    return `select ${writeableFieldsNames.join(',')} from SDOC__SDTemplate__c`;
  }
}
