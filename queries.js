import { prefixes } from "./prefixes";
import { sparqlEscapeUri } from 'mu';
import { querySudo as query } from "@lblod/mu-auth-sudo";
import { bindingsToNT } from "./utils/bindingsToNT";

export async function getPublicServiceDetails( publicServiceUri ) {
  //we make a intermediate data structure to ease posting to ldes endpoint
  const results = [];
  const publicServiceQuery = `
    ${prefixes}

    SELECT DISTINCT ?s ?p ?o {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?s)
      GRAPH ?g {
        ?s a cpsv:PublicService;
          ?p ?o.
      }
    }
  `;

  const queryResult = await query(publicServiceQuery);
  const publicServiceBody = bindingsToNT(queryResult.results.bindings).join("\r\n");

  results.push(
    {
      subject: publicServiceUri,
      body: publicServiceBody,
    }
  );

  //get the remaining data
  const relationQuery = `
    ${prefixes}
    SELECT DISTINCT ?s ?p ?o
    WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
      {
        ?service a cpsv:PublicService;
          belgif:hasRequirement ?requirement.
        ?requirement a m8g:Requirement;
          m8g:hasSupportingEvidence ?s.
        ?s a m8g:Evidence;
          ?p ?o.
      }
      UNION {
        ?service a cpsv:PublicService;
          belgif:hasRequirement ?s.
        ?s a m8g:Requirement;
          ?p ?o.
      }
      UNION {
        ?service a cpsv:PublicService;
          cpsv:follows ?rule.
        ?rule a cpsv:Rule;
          lpdcExt:hasOnlineProcedure ?s.
        ?s a schema:Website;
          ?p ?o.
      }
      UNION {
        ?service a cpsv:PublicService;
          cpsv:follows ?s.
        ?s a cpsv:Rule;
          ?p ?o.
      }
      UNION {
        ?service a cpsv:PublicService;
          m8g:hasCost ?s.
         ?s a m8g:Cost;
          ?p ?o.
      }
      UNION {
        ?service a cpsv:PublicService;
          cpsv:produces ?s.
         ?s a lpdcExt:FinancialAdvantage;
          ?p ?o.
      }
      UNION {
        ?service a cpsv:PublicService;
          m8g:hasContactPoint ?s.
         ?s a schema:ContactPoint;
          ?p ?o.
      }
      UNION {
        ?service a cpsv:PublicService;
          lpdcExt:attachment ?s.
         ?s a foaf:Document;
          ?p ?o.
      }
      UNION {
        ?service a cpsv:PublicService;
          rdfs:seeAlso ?s.
        ?s a schema:Website;
          ?p ?o.
      }
    }
  `;

  const relationsResult = await query(relationQuery);

  //some mediocre post postprocessing to extract all unique subjects
  const relatedSubjects = [ ...new Set(relationsResult.results.bindings.map(result => result.s.value)) ];

  const relationsBody = bindingsToNT(relationsResult.results.bindings).join("\r\n");

  for(const subject of relatedSubjects) {
    results.push({
      subject,
      //TODO: this will send every time the same body again, with a different resource to process. this is suboptimal
      body: relationsBody,
    });
  }

  return results;
}
