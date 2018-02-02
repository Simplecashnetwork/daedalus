import http from 'http';
import FormData from 'form-data/lib/form_data';
import fs from 'fs';
import path from 'path';
import { map, get } from 'lodash';

export type RequestOptions = {
  hostname: string,
  method: string,
  path: string,
  port: number,
  headers?: {
    'Content-Type': string,
  },
};

export type RequestPayload = {
  application: string,
  version: string,
  build: string,
  os: string,
  logs: Array<string>,
  date: string,
  magic: number,
  type: {
    type : string,
    email: string,
    subject: string,
    problem: string,
  }
};

function typedHttpRequest<Response>(
  httpOptions: RequestOptions, requestPayload?: RequestPayload
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const options: RequestOptions = Object.assign({}, httpOptions);
    const payload: RequestPayload = Object.assign({}, requestPayload);
    // Prepare multipart/form-data
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    const logs = payload.logs;
    if (logs) {
      const logsPath = get(logs, ['path']);
      const logsFileNames = get(logs, ['files']);

      map(logsFileNames, (fileName) => {
        const stream = fs.createReadStream(path.join(logsPath, fileName));
        formData.append(fileName, stream);
      });
    }

    options.headers = formData.getHeaders();
    const httpRequest = http.request(options);

    // Attach form-data to the request
    formData.pipe(httpRequest);

    httpRequest.on('response', (response) => {
      console.debug('response', response);
      response.on('data', (chunk) => {
        console.debug('response.data', chunk);
      });
      response.on('error', (error) => {
        console.debug('response.error', error);
        reject(error);
      });
      response.on('end', () => {
        console.debug('response.end');
        resolve();
      });
    });
    httpRequest.on('error', (error) => reject(error));
  });
}

export const request = typedHttpRequest;
