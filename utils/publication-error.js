import {prefixes} from "../prefixes";
import { sparqlEscapeUri, sparqlEscapeDateTime, sparqlEscapeString, sparqlEscapeInt } from 'mu';
import uuid from "uuid";
import {updateSudo} from "@lblod/mu-auth-sudo";

export async function createPublicationError(errorCode, errorMessage, instanceIri, title, bestuurseenheidIri){
  // TODO make sure it works for tombstones too.
  const publicationErrorIri = `http://data.lblod.info/id/instance-publication-error/${uuid()}`;

  const insertPublicationError = `
  ${prefixes}

  INSERT DATA {
    GRAPH <http://mu.semte.ch/graphs/lpdc/ipdc-publication-errors> {
      ${sparqlEscapeUri(publicationErrorIri)} a <http://data.lblod.info/vocabularies/lpdc/instance-publication-error> .
      ${sparqlEscapeUri(publicationErrorIri)} http:statusCode ${sparqlEscapeInt(errorCode)} .
      ${sparqlEscapeUri(publicationErrorIri)} schema:error ${sparqlEscapeString(errorMessage)} .
      ${sparqlEscapeUri(publicationErrorIri)} dct:source ${sparqlEscapeUri(instanceIri)} .
      ${sparqlEscapeUri(publicationErrorIri)} dct:title ${sparqlEscapeString(title ?? "")} .
      ${sparqlEscapeUri(publicationErrorIri)} foaf:owner ${sparqlEscapeUri(bestuurseenheidIri)} .
      ${sparqlEscapeUri(publicationErrorIri)} schema:dateCreated ${sparqlEscapeDateTime(new Date())} .
    }
  }`;
  await updateSudo(insertPublicationError);
}


export async function clearPublicationErrors(){
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
