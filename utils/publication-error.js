import {prefixes} from "../prefixes";
import {sparqlEscapeUri, sparqlEscapeDateTime, sparqlEscapeString, sparqlEscapeInt} from 'mu';
import uuid from "uuid";
import {updateSudo} from "@lblod/mu-auth-sudo";

export async function createPublicationError(errorCode, errorMessage, instanceIri, title, bestuurseenheidIri, dateSent, datePublished) {
  const publicationErrorIri = `http://data.lblod.info/id/instance-publication-error/${uuid()}`;

  const triples = [
    `${sparqlEscapeUri(publicationErrorIri)} a <http://data.lblod.info/vocabularies/lpdc/instance-publication-error> .`,
    errorCode ? `${sparqlEscapeUri(publicationErrorIri)} http:statusCode ${sparqlEscapeInt(errorCode)} .` : undefined,
    errorMessage ? `${sparqlEscapeUri(publicationErrorIri)} schema:error ${sparqlEscapeString(errorMessage)} .` : undefined,
    instanceIri ? `${sparqlEscapeUri(publicationErrorIri)} dct:source ${sparqlEscapeUri(instanceIri)} .` : undefined,
    title ? `${sparqlEscapeUri(publicationErrorIri)} dct:title ${sparqlEscapeString(title)} .` : undefined,
    bestuurseenheidIri ? `${sparqlEscapeUri(publicationErrorIri)} foaf:owner ${sparqlEscapeUri(bestuurseenheidIri)} .` : undefined,
    `${sparqlEscapeUri(publicationErrorIri)} schema:dateCreated ${sparqlEscapeDateTime(new Date())} .`,
    dateSent ? `${sparqlEscapeUri(publicationErrorIri)} schema:dateSent ${sparqlEscapeDateTime(dateSent)} .` : undefined,
    datePublished ? `${sparqlEscapeUri(publicationErrorIri)} schema:datePublished ${sparqlEscapeDateTime(datePublished)} .` : undefined,
  ].filter(it => !!it);

  const insertPublicationError = `
  ${prefixes}

  INSERT DATA {
    GRAPH <http://mu.semte.ch/graphs/lpdc/ipdc-publication-errors> {
      ${triples.join("\n")}
    }
  }`;
  await updateSudo(insertPublicationError);
}


export async function clearPublicationErrors() {
  const clearPublicationErrors = `
  ${prefixes}

  DELETE {
    GRAPH <http://mu.semte.ch/graphs/lpdc/ipdc-publication-errors> {
        ?s ?p ?o.
    }
  } WHERE {
    GRAPH <http://mu.semte.ch/graphs/lpdc/ipdc-publication-errors> {
        ?s a <http://data.lblod.info/vocabularies/lpdc/instance-publication-error> .
        ?s ?p ?o.
    }
  }
`;
  await updateSudo(clearPublicationErrors);
}
