import { stripTokenPageThirdPartyScripts } from "../_lib/strip-token-third-party-scripts";

export const onRequest: PagesFunction = stripTokenPageThirdPartyScripts;
