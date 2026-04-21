import { prefixes } from "../prefixes";
import {
  sparqlEscapeUri,
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeInt,
} from "mu";
import uuid from "uuid";
import { updateSudo } from "@lblod/mu-auth-sudo";
import { subMonths } from "date-fns";
import { ERROR_EXPIRATION_MONTHS } from "../env-config";

export async function createPublicationError(errorCode, errorMessage, instanceIri, title, bestuurseenheidIri, dateSent, type) {
  const uuidError = uuid()
  const publicationErrorIri = `http://data.lblod.info/id/instance-publication-error/${uuidError}`;

  const triples = [
    `${sparqlEscapeUri(publicationErrorIri)} a lpdc:InstancePublicationError .`,
    `${sparqlEscapeUri(publicationErrorIri)} a oslc:Error .`,
    `${sparqlEscapeUri(publicationErrorIri)} mu:uuid ${sparqlEscapeString(uuidError)}. `,
    `${sparqlEscapeUri(publicationErrorIri)} dct:subject ${sparqlEscapeString("lpdc-publish")}.`,
    `${sparqlEscapeUri(publicationErrorIri)} dct:creator ${sparqlEscapeUri("http://lblod.data.gift/services/lpdc-publish")}.`,
    `${sparqlEscapeUri(publicationErrorIri)} oslc:message ${sparqlEscapeString("Publishing instance to IPDC failed.")}.`,
    errorCode ? `${sparqlEscapeUri(publicationErrorIri)} http:statusCode ${sparqlEscapeInt(errorCode)} .` : undefined,
    errorMessage ? `${sparqlEscapeUri(publicationErrorIri)} oslc:largePreview ${sparqlEscapeString(errorMessage)} .` : undefined,
    instanceIri ? `${sparqlEscapeUri(publicationErrorIri)} dct:references ${sparqlEscapeUri(instanceIri)} .` : undefined,
    title ? `${sparqlEscapeUri(publicationErrorIri)} dct:title ${sparqlEscapeString(title)} .` : undefined,
    bestuurseenheidIri ? `${sparqlEscapeUri(publicationErrorIri)} foaf:owner ${sparqlEscapeUri(bestuurseenheidIri)} .` : undefined,
    `${sparqlEscapeUri(publicationErrorIri)} dct:created ${sparqlEscapeDateTime(new Date())} .`,
    dateSent ? `${sparqlEscapeUri(publicationErrorIri)} schema:dateSent ${sparqlEscapeDateTime(dateSent)} .` : undefined,
    type ? `${sparqlEscapeUri(publicationErrorIri)} as:formerType ${sparqlEscapeUri(type)} .` : undefined,
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
  const yearAgo = subMonths(new Date(), ERROR_EXPIRATION_MONTHS);
  const clearPublicationErrors = `
  ${prefixes}

  DELETE {
    GRAPH <http://mu.semte.ch/graphs/lpdc/ipdc-publication-errors> {
        ?s ?p ?o.
    }
  } WHERE {
    GRAPH <http://mu.semte.ch/graphs/lpdc/ipdc-publication-errors> {
        ?s a <http://data.lblod.info/vocabularies/lpdc/InstancePublicationError> ;
          ?p ?o ;
          dct:created ?dateCreated .
    }
    FILTER ( ?dateCreated < ${sparqlEscapeDateTime(yearAgo)} )
  }
`;
  await updateSudo(clearPublicationErrors);
}
