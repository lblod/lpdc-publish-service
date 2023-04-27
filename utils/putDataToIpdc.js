import * as jsonld from 'jsonld';
import N3 from 'n3';
import fetch from 'node-fetch';
import { IPDC_JSON_ENDPOINT, IPDC_X_API_KEY } from '../env-config';

export async function putDataToIpdc(subjectsAndData) {
  let ttl = '';
  for (const subject of Object.keys(subjectsAndData)) {
    const body = subjectsAndData[subject].body;
    ttl += body;
  }

  const parser = new N3.Parser({ format: 'text/turtle' });

  const quads = parser.parse(ttl);

  const fromRdf = await jsonld.fromRDF(quads);
  const doc = await jsonld.expand(fromRdf);

  const headers = {
    'x-api-key': IPDC_X_API_KEY,
    'Content-Type': 'application/ld+json'
  };

  const response = await fetch(IPDC_JSON_ENDPOINT, {
    method: "PUT",
    headers,
    body: JSON.stringify(doc),
  });

  if (!response.ok) {
    throw new Error("Something went wrong when submitting to IPDC: \n" + "IPDC response: " + JSON.stringify(response) + "\n"
                    + "Response status code: " + response.status + "\n"
                    + "Data sent to IPDC: " + JSON.stringify(doc));
  }
  else {
    console.log("Successfully sent data to IPDC: \n" + JSON.stringify(doc));
  }
}
