import * as jsonld from 'jsonld';
import N3 from 'n3';
import fetch from 'node-fetch';
import {IPDC_JSON_ENDPOINT, IPDC_X_API_KEY} from '../env-config';
import {createPublicationError} from "./publication-error";

export async function putDataToIpdc(graph, instanceIri, subjectsAndData) {
  let ttl = '';
  for (const subject of Object.keys(subjectsAndData)) {
    const body = subjectsAndData[subject].body;
    ttl += body;
  }

  const parser = new N3.Parser({format: 'text/turtle'});

  const quads = parser.parse(ttl);

  // e.g http://mu.semte.ch/graphs/organizations/73840d393bd94828f0903e8357c7f328d4bf4b8fbd63adbfa443e784f056a589/LoketLB-LPDCGebruiker
  const bestuurseenheidId = graph.split("/")[5];
  const bestuurseenheidIri = `http://data.lblod.info/id/bestuurseenheden/${bestuurseenheidId}`;

  const titleQuad = quads
    .filter(q => q.subject.value === instanceIri && q.predicate.value === 'http://purl.org/dc/terms/title')
    .filter(q => q.object.language.startsWith('nl'));
  const title = titleQuad[0]?.object?.value;

  const dateSent = quads
    .find(q => q.subject.value === instanceIri && q.predicate.value === 'http://schema.org/dateSent')
    ?.object?.value;

  const datePublished = quads
    .find(q => q.subject.value === instanceIri && q.predicate.value === 'http://schema.org/datePublished')
    ?.object?.value;

  const dateDeleted = quads
    .find(q => q.subject.value === instanceIri && q.predicate.value === 'https://www.w3.org/ns/activitystreams#deleted')
    ?.object?.value;


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
    const responseBody = await getResponseBody(response);
    try {
      await createPublicationError(response.status, JSON.stringify(responseBody), instanceIri, title, bestuurseenheidIri, dateSent ?? dateDeleted, datePublished);
    } catch (e) {
      console.log('Could not save publicationError', e);
    }
    throw new Error("Something went wrong when submitting to IPDC: \n" + "IPDC response: " + JSON.stringify(responseBody) + "\n"
      + "Response status code: " + response.status + "\n"
      + "Data sent to IPDC: " + JSON.stringify(doc));
  } else {
    console.log("Successfully sent data to IPDC: \n" + JSON.stringify(doc));
  }
}


async function getResponseBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return {message: text}
  }
}
