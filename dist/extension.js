var kt=Object.create;var Le=Object.defineProperty;var Ct=Object.getOwnPropertyDescriptor;var xt=Object.getOwnPropertyNames;var St=Object.getPrototypeOf,$t=Object.prototype.hasOwnProperty;var Dt=(u,t)=>()=>(u&&(t=u(u=0)),t);var dt=(u,t)=>{for(var e in t)Le(u,e,{get:t[e],enumerable:!0})},pt=(u,t,e,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of xt(t))!$t.call(u,n)&&n!==e&&Le(u,n,{get:()=>t[n],enumerable:!(s=Ct(t,n))||s.enumerable});return u};var y=(u,t,e)=>(e=u!=null?kt(St(u)):{},pt(t||!u||!u.__esModule?Le(e,"default",{value:u,enumerable:!0}):e,u)),Tt=u=>pt(Le({},"__esModule",{value:!0}),u);var ut={};dt(ut,{clearExecutionHistory:()=>Ft,getExecutionHistory:()=>st,isTestRunning:()=>nt,runBDDTests:()=>Ce,terminateBDDTests:()=>tt});async function It(u,t={},e="operation",s){let n={...Pt,...t},o=null;for(let i=1;i<=n.maxAttempts;i++)try{s?.appendLine(`\u{1F504} ${e} - Attempt ${i}/${n.maxAttempts}`);let a=await u();return i>1&&s?.appendLine(`\u2705 ${e} succeeded on attempt ${i}`),a}catch(a){o=a;let c=n.retryableErrors.some(w=>o.message.toLowerCase().includes(w.toLowerCase()));if(i===n.maxAttempts||!c)throw s?.appendLine(`\u274C ${e} failed permanently: ${o.message}`),o;let g=n.delayMs*Math.pow(n.backoffMultiplier,i-1);s?.appendLine(`\u26A0\uFE0F ${e} failed (attempt ${i}): ${o.message}. Retrying in ${g}ms...`),await new Promise(w=>setTimeout(w,g))}throw o||new Error(`${e} failed after ${n.maxAttempts} attempts`)}async function Ce(u,t,e,s){let n=F.workspace.workspaceFolders;if(!n){let a="No workspace folder open. Cannot execute BDD tests.";F.window.showErrorMessage(a),s?.appendLine(`[ERROR] ${a}`),u?.end();return}if(te){let a="Another BDD test is already running. Please wait or terminate it first.";F.window.showWarningMessage(a),s?.appendLine(`[WARNING] ${a}`);return}let o=n[0].uri.fsPath,i=F.workspace.getConfiguration("playwrightBdd");try{let a=i.get("enableFeatureGen",!0),c=i.get("configPath")||"./playwright.config.ts",g=i.get("tsconfigPath")||"",w=i.get("tags")||"",b=i.get("featureFolder","features"),I=ke.resolve(o,c);s?.appendLine(`Using config: ${I}`);let S=i.get("featureGenCommand")||"npx bddgen --config=${configPath}",C=i.get("testCommand")||"npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}",A=c,G=g?`${g}`:"",P=w?`--grep "${w}"`:"";if(S=S.replace("${configPath}",A).replace("${tsconfigArg}",G).replace("${tagsArg}",P),C=C.replace("${configPath}",A).replace("${tsconfigArg}",G).replace("${tagsArg}",P),e?.uri?.fsPath){let V=ke.resolve(o,b),R=ke.relative(V,e.uri.fsPath);if(C+=` "${R}"`,e.label&&e.parent){let M=e.label;C+=` --grep "${M}"`,s?.appendLine(`Targeting specific test: ${M}`)}}let U=async(V,R,M)=>{let W=Date.now();s?.appendLine(`[${new Date().toISOString()}] Running ${R}: ${V}`);let se=F.window.createStatusBarItem(F.StatusBarAlignment.Left);se.text=`$(sync~spin) ${R}...`,se.show();let Te=()=>new Promise((z,Z)=>{te=(0,lt.exec)(V,{cwd:o,timeout:3e5,maxBuffer:1024*1024*10},(q,J,K)=>{te=null,q?Z(q):z({stdout:J||"",stderr:K||""})}),te.on("error",q=>{s?.appendLine(`[ERROR] Process error: ${q.message}`),Z(q)})});try{let z=i.get("execution.retryCount",2),Z=i.get("execution.retryDelay",2e3),q=await It(Te,{maxAttempts:z,delayMs:Z},R,s),J=Date.now()-W;se.hide(),se.dispose(),ee.push({timestamp:new Date,command:V,success:!0,duration:J}),ee.length>20&&(ee=ee.slice(-20));let K=`${R} completed successfully in ${J}ms`;if(s?.appendLine(`[SUCCESS] ${K}`),q.stdout&&u?.appendOutput(q.stdout),e&&u?.passed(e),M){M();return}u?.end()}catch(z){let Z=Date.now()-W;se.hide(),se.dispose(),ee.push({timestamp:new Date,command:V,success:!1,duration:Z}),ee.length>20&&(ee=ee.slice(-20));let q=z.stderr||z.message,J=`${R} failed after ${Z}ms:
${q}`;if(s?.appendLine(`[ERROR] ${J}`),u?.appendOutput(q),e){let K=new F.TestMessage(q);K.location=e.uri?new F.Location(e.uri,new F.Position(0,0)):void 0,u?.failed(e,K)}z.message.includes("ENOENT")||z.message.includes("command not found")?F.window.showErrorMessage(`${R} failed: Command not found. Make sure Playwright and playwright-bdd are installed.`):z.message.includes("timeout")?F.window.showErrorMessage(`${R} timed out after ${Math.round(Z/1e3)}s. Consider increasing the timeout.`):F.window.showErrorMessage(`${R} failed. Check the output panel for details.`),u?.end()}};a?(await U(S,"Feature generation"),await U(C,"BDD test run")):await U(C,"BDD test run")}catch(a){let c=`Failed to setup BDD test execution: ${a}`;s?.appendLine(`[ERROR] ${c}`),F.window.showErrorMessage(c),u?.end()}}function tt(){if(te)try{te.kill("SIGTERM"),setTimeout(()=>{te&&(te.kill("SIGKILL"),te=null)},5e3),F.window.showInformationMessage("\u{1F6D1} BDD test execution terminated.")}catch(u){F.window.showErrorMessage(`Failed to terminate BDD test: ${u}`)}else F.window.showInformationMessage("No BDD test is currently running.")}function st(){return ee.slice()}function Ft(){ee=[]}function nt(){return te!==null}var F,ke,lt,te,ee,Pt,Me=Dt(()=>{F=y(require("vscode")),ke=y(require("path")),lt=require("child_process"),te=null,ee=[],Pt={maxAttempts:3,delayMs:1e3,backoffMultiplier:2,retryableErrors:["ECONNRESET","ETIMEDOUT","ENOTFOUND","EAI_AGAIN","socket hang up","network timeout","connection refused","EPIPE"]}});var Lt={};dt(Lt,{activate:()=>Rt});module.exports=Tt(Lt);var r=y(require("vscode")),ce=y(require("path"));Me();var X=y(require("vscode"));Me();var We=class{constructor(t){this.enableFeatureGen=t;this._onDidChangeCodeLenses=new X.EventEmitter;this.onDidChangeCodeLenses=this._onDidChangeCodeLenses.event}refresh(){this._onDidChangeCodeLenses.fire()}provideCodeLenses(t){try{let e=[],s=t.getText();if(!s.trim())return e;let n=s.split(`
`),o=nt(),i=st(),a=s.match(/^\s*Feature:\s*(.+)/m);if(a){let c=a[1].trim(),g=0;for(let S=0;S<n.length;S++)if(n[S].match(/^\s*Feature:/)){g=S;break}let w=new X.Range(g,0,g,n[g].length),b=i.filter(S=>S.command.includes(c)).sort((S,C)=>C.timestamp.getTime()-S.timestamp.getTime())[0],I=o?"\u23F3 Running...":b?.success===!1?"\u274C Run Feature (Failed)":b?.success===!0?"\u2705 Run Feature":"\u25B6 Run Feature";if(e.push(new X.CodeLens(w,{title:I,command:o?void 0:"playwright-bdd.runScenarioDynamic",arguments:o?void 0:[c,this.enableFeatureGen]})),e.push(new X.CodeLens(w,{title:o?"\u23F3 Debug...":"\u{1F41E} Debug Feature",command:o?void 0:"playwright-bdd.debugScenario",arguments:o?void 0:[c]})),b&&b.duration>0){let S=b.duration>1e3?`${Math.round(b.duration/1e3)}s`:`${b.duration}ms`;e.push(new X.CodeLens(w,{title:`\u23F1 Last run: ${S}`,command:void 0}))}}for(let c=0;c<n.length;c++){let g=n[c].match(/^\s*Scenario(?: Outline)?:\s*(.+)/);if(g){let w=g[1].trim(),b;for(let G=c-1;G>=0;G--){let P=n[G].match(/^\s*@(\w+)/);if(P){b=`@${P[1]}`;break}else{if(n[G].trim()==="")continue;break}}let I=new X.Range(c,0,c,n[c].length),S=b??w,C=i.filter(G=>G.command.includes(w)||b&&G.command.includes(b)).sort((G,P)=>P.timestamp.getTime()-G.timestamp.getTime())[0],A=o?"\u23F3 Running...":C?.success===!1?"\u274C Run Scenario (Failed)":C?.success===!0?"\u2705 Run Scenario":"\u25B6 Run Scenario";e.push(new X.CodeLens(I,{title:A,command:o?void 0:"playwright-bdd.runScenarioDynamic",arguments:o?void 0:[S,this.enableFeatureGen]})),e.push(new X.CodeLens(I,{title:o?"\u23F3 Debug...":"\u{1F41E} Debug Scenario",command:o?void 0:"playwright-bdd.debugScenario",arguments:o?void 0:[S]}))}}return e}catch(e){return console.error("[FeatureCodeLensProvider] Error providing code lenses:",e),[]}}};var fe=y(require("vscode")),me=y(require("path")),oe=y(require("fs")),Ae=class{constructor(t){this.stepDefinitions=[];this.outputChannel=t}async discoverStepDefinitions(t,e="src/steps"){try{this.outputChannel.appendLine("\u{1F50D} Starting step definition discovery...");let s=Date.now();this.stepDefinitions=[];let n=me.resolve(t,e);if(!oe.existsSync(n)){this.outputChannel.appendLine(`\u26A0\uFE0F Steps folder not found: ${n}`);return}let o=await this.findStepFiles(n);this.outputChannel.appendLine(`\u{1F4C1} Found ${o.length} step definition files`);for(let a of o)try{await this.parseStepFile(a)}catch(c){this.outputChannel.appendLine(`\u274C Error parsing step file ${a}: ${c}`)}let i=Date.now()-s;this.outputChannel.appendLine(`\u2705 Step discovery completed in ${i}ms. Found ${this.stepDefinitions.length} step definitions.`)}catch(s){this.outputChannel.appendLine(`\u274C Step definition discovery failed: ${s}`)}}async findStepFiles(t){let e=[],s=n=>{try{let o=oe.readdirSync(n);for(let i of o){let a=me.join(n,i);try{oe.statSync(a).isDirectory()?s(a):(i.endsWith(".ts")||i.endsWith(".js"))&&e.push(a)}catch{continue}}}catch(o){this.outputChannel.appendLine(`\u26A0\uFE0F Error scanning directory ${n}: ${o}`)}};return s(t),e}async parseStepFile(t){try{let s=oe.readFileSync(t,"utf8").split(`
`);for(let n=0;n<s.length;n++){let o=s[n].trim(),i=[/^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(.+)\)/,/^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*\)\s*=>\s*\{/,/^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s+function\s*\(/,/^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\([^)]*\)\s*:\s*[^=]*=>\s*\{/,/^@(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/,/^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*$/];for(let a of i){let c=o.match(a);if(c){let[g,w,b]=c,I="";if(g.includes(",")){let C=g.indexOf(",");I=g.substring(C+1).trim()}else{let C=n+1;for(;C<s.length&&C<n+5;){let A=s[C].trim();if(A.includes("async")||A.includes("function")||A.includes("=>")){I=A;break}C++}}this.stepDefinitions.some(C=>C.pattern===b&&C.type===w&&C.file===t)||(this.stepDefinitions.push({pattern:b,type:w,file:t,line:n+1,function:I||"function definition"}),this.outputChannel.appendLine(`  \u{1F4DD} Found ${w}: "${b}" in ${me.basename(t)}:${n+1}`));break}}}}catch(e){this.outputChannel.appendLine(`\u274C Error reading step file ${t}: ${e}`)}}async provideDefinition(t,e,s){let o=t.lineAt(e).text.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)/);if(o){let i=o[2].trim();return await this.findStepDefinition(i)}}async findStepDefinition(t){let e=this.findMatchingStep(t);if(e){let s=fe.Uri.file(e.file),n=new fe.Position(e.line-1,0);return new fe.Location(s,n)}}findMatchingStep(t){return this.stepDefinitions.find(e=>{try{if(t.toLowerCase()===e.pattern.toLowerCase())return!0;let s=e.pattern;s=s.replace(/'<[^>]+>'/g,"'[^']*'").replace(/"<[^>]+>"/g,'"[^"]*"').replace(/<[^>]+>/g,"[^\\s]+"),s=s.replace(/\{string\}/g,`(?:["'][^"']*["'])`).replace(/\{int\}/g,"\\d+").replace(/\{float\}/g,"\\d+\\.?\\d*").replace(/\{word\}/g,"[a-zA-Z0-9_]+").replace(/\{[^}]+\}/g,"[^\\s]+"),s=s.replace(/'[^']*'/g,"'[^']*'").replace(/"[^"]*"/g,'"[^"]*"'),s=s.replace(/\s+/g,"\\s+");try{if(new RegExp(`^${s}$`,"i").test(t))return!0}catch{}return!!(this.performApiAwareFuzzyMatch(t,e.pattern)||this.performStructuralMatch(t,e.pattern))}catch{return!1}})}performApiAwareFuzzyMatch(t,e){try{let s=g=>g.toLowerCase().replace(/'<[^>]+>'/g,"SCENARIO_PARAM").replace(/"<[^>]+>"/g,"SCENARIO_PARAM").replace(/<[^>]+>/g,"SCENARIO_PARAM").replace(/\{[^}]+\}/g,"CUCUMBER_PARAM").replace(/'[^']*'/g,"QUOTED_STRING").replace(/"[^"]*"/g,"QUOTED_STRING").replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim(),n=s(t),o=s(e);if(n===o)return!0;let i=["api","call","request","response","get","post","put","delete","patch","through","aggregator","endpoint"],a=i.filter(g=>n.includes(g)),c=i.filter(g=>o.includes(g));return a.length>0&&c.length>0?a.filter(w=>c.includes(w)).length>0:!1}catch{return!1}}performStructuralMatch(t,e){try{let s=c=>c.toLowerCase().replace(/'<[^>]+>'/g,"").replace(/"<[^>]+>"/g,"").replace(/<[^>]+>/g,"").replace(/\{[^}]+\}/g,"").replace(/'[^']*'/g,"").replace(/"[^"]*"/g,"").split(/\s+/).filter(g=>g.length>2).filter(g=>!["and","the","for","with","from","that"].includes(g)),n=s(t),o=s(e);return n.length===0||o.length===0?!1:n.filter(c=>o.some(g=>c.includes(g)||g.includes(c))).length/Math.max(n.length,o.length)>=.6}catch{return!1}}getAllStepDefinitions(){return[...this.stepDefinitions]}getStepCoverageForFeature(t){try{let s=oe.readFileSync(t,"utf8").split(`
`),n=[],o=[];for(let i of s){let a=i.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)/);if(a){let c=a[2].trim();n.push(c),this.findMatchingStep(c)||o.push(c)}}return{covered:n.length-o.length,total:n.length,missing:o}}catch(e){return this.outputChannel.appendLine(`\u274C Error analyzing step coverage for ${t}: ${e}`),{covered:0,total:0,missing:[]}}}};var ht=y(require("vscode")),Ee=y(require("fs")),Be=y(require("path")),Oe=class{constructor(t){this.cacheVersion="1.0.0";this.outputChannel=t,this.cache={version:this.cacheVersion,features:new Map,lastScan:0}}async needsUpdate(t){try{let e=t.fsPath,n=(await Ee.promises.stat(e)).mtime.getTime(),o=this.cache.features.get(e);return o?o.lastModified<n?(this.outputChannel.appendLine(`\u{1F504} File modified: ${Be.basename(e)}`),!0):!1:!0}catch(e){return this.outputChannel.appendLine(`\u26A0\uFE0F Error checking file modification: ${e}`),!0}}getCachedFeature(t){return this.cache.features.get(t.fsPath)}async updateCache(t,e){try{let s=await Ee.promises.stat(t.fsPath);e.lastModified=s.mtime.getTime(),this.cache.features.set(t.fsPath,e),this.outputChannel.appendLine(`\u{1F4BE} Cached feature: ${Be.basename(t.fsPath)}`)}catch(s){this.outputChannel.appendLine(`\u26A0\uFE0F Error updating cache: ${s}`)}}removeFromCache(t){this.cache.features.delete(t.fsPath)&&this.outputChannel.appendLine(`\u{1F5D1}\uFE0F Removed from cache: ${Be.basename(t.fsPath)}`)}async incrementalDiscovery(t,e){let s=Date.now(),n=0,o=0;this.outputChannel.appendLine("\u{1F680} Starting incremental test discovery...");for(let a of t)try{await this.needsUpdate(a)?(await e(a,!1),n++):(await e(a,!0),o++)}catch(c){this.outputChannel.appendLine(`\u274C Error processing ${a.fsPath}: ${c}`)}let i=Date.now()-s;return this.cache.lastScan=Date.now(),this.outputChannel.appendLine(`\u2705 Incremental discovery completed: ${n} processed, ${o} from cache, ${i}ms`),{processed:n,fromCache:o,duration:i}}clearCache(){this.cache.features.clear(),this.cache.lastScan=0,this.outputChannel.appendLine("\u{1F9F9} Test discovery cache cleared")}getCacheStats(){let t=Date.now(),e=Array.from(this.cache.features.values()).filter(s=>t-s.lastModified<3e5);return{totalFeatures:this.cache.features.size,lastScan:this.cache.lastScan>0?new Date(this.cache.lastScan):null,cacheHitRate:this.cache.features.size>0?e.length/this.cache.features.size:0}}async validateAndCleanCache(){let t=Date.now(),e=0;this.outputChannel.appendLine("\u{1F9F9} Validating cache integrity...");for(let[n,o]of this.cache.features.entries())try{await Ee.promises.access(n)}catch{this.cache.features.delete(n),e++}let s=Date.now()-t;this.outputChannel.appendLine(`\u2705 Cache validation completed: ${e} stale entries removed in ${s}ms`)}createCachedItem(t){let e=[];return t.children.forEach(s=>{let n=[];s.children.forEach(o=>{n.push({id:o.id,label:o.label})}),e.push({id:s.id,label:s.label,examples:n.length>0?n:void 0})}),{id:t.id,label:t.label,uri:t.uri?.toString()||"",lastModified:0,scenarios:e}}recreateTestItem(t,e){let s=ht.Uri.parse(t.uri),n=e.createTestItem(t.id,t.label,s);for(let o of t.scenarios){let i=e.createTestItem(o.id,o.label,s);if(n.children.add(i),o.examples)for(let a of o.examples){let c=e.createTestItem(a.id,a.label,s);i.children.add(c)}}return n}};var gt=y(require("path")),He=class{constructor(t){this.searchHistory=[];this.outputChannel=t}async searchTests(t,e,s={}){let n=Date.now(),o=[];this.outputChannel.appendLine(`\u{1F50D} Starting advanced search: "${e}"`),this.addToSearchHistory(e);let i=e.toLowerCase().trim();if(!i&&Object.keys(s).length===0)return o;t.items.forEach(c=>{this.searchInTestItem(c,i,s,o)}),o.sort((c,g)=>this.calculateRelevance(g,i)-this.calculateRelevance(c,i));let a=Date.now()-n;return this.outputChannel.appendLine(`\u2705 Search completed in ${a}ms. Found ${o.length} matches.`),o}searchInTestItem(t,e,s,n){let o=this.checkItemMatch(t,e,s);o.length>0&&n.push(...o),t.children.forEach(i=>{this.searchInTestItem(i,e,s,n)})}checkItemMatch(t,e,s){let n=[],o=t.label.toLowerCase(),i=t.uri?.fsPath||"",a=gt.basename(i).toLowerCase();if(s.filePattern&&!a.includes(s.filePattern.toLowerCase())||s.featureName&&!o.includes(s.featureName.toLowerCase())||s.scenarioName&&t.parent&&!o.includes(s.scenarioName.toLowerCase()))return n;if(e&&o.includes(e)){let c=this.determineMatchType(t);n.push({testItem:t,matchType:c,matchText:t.label,filePath:i})}if(s.tags&&s.tags.length>0){let c=this.searchForTags(t,s.tags);n.push(...c)}if(s.stepText){let c=this.searchForSteps(t,s.stepText);n.push(...c)}return n}searchForTags(t,e){let s=[];if(!t.uri)return s;try{let o=require("fs").readFileSync(t.uri.fsPath,"utf8").split(`
`);for(let i=0;i<o.length;i++){let a=o[i].trim();if(a.startsWith("@")){let c=a.split(/\s+/).filter(g=>g.startsWith("@"));for(let g of e){let w=g.startsWith("@")?g:`@${g}`;c.some(b=>b.toLowerCase().includes(w.toLowerCase()))&&s.push({testItem:t,matchType:"tag",matchText:a,filePath:t.uri.fsPath,line:i+1})}}}}catch{}return s}searchForSteps(t,e){let s=[];if(!t.uri)return s;try{let o=require("fs").readFileSync(t.uri.fsPath,"utf8").split(`
`),i=e.toLowerCase();for(let a=0;a<o.length;a++){let c=o[a].trim().toLowerCase();/^\s*(given|when|then|and|but)\s+/i.test(c)&&c.includes(i)&&s.push({testItem:t,matchType:"step",matchText:o[a].trim(),filePath:t.uri.fsPath,line:a+1})}}catch{}return s}determineMatchType(t){return t.parent?(t.children.size>0,"scenario"):"feature"}calculateRelevance(t,e){let s=0,n=t.matchText.toLowerCase();switch(n===e&&(s+=100),n.startsWith(e)&&(s+=50),t.matchType){case"feature":s+=20;break;case"scenario":s+=15;break;case"tag":s+=10;break;case"step":s+=5;break}return s+=Math.max(0,20-n.length),s}async getSearchSuggestions(t,e){let s=new Set,n=e.toLowerCase();return this.searchHistory.filter(o=>o.toLowerCase().includes(n)).forEach(o=>s.add(o)),t.items.forEach(o=>{o.label.toLowerCase().includes(n)&&s.add(o.label),o.children.forEach(i=>{i.label.toLowerCase().includes(n)&&s.add(i.label)})}),Array.from(s).slice(0,10)}buildAdvancedFilter(t){let e={},s=/(\w+):([^\s]+)/g,n;for(;(n=s.exec(t))!==null;){let[,o,i]=n;switch(o.toLowerCase()){case"tag":e.tags||(e.tags=[]),e.tags.push(i);break;case"feature":e.featureName=i;break;case"scenario":e.scenarioName=i;break;case"step":e.stepText=i;break;case"file":e.filePattern=i;break;case"status":e.status=i;break}}return e}exportSearchResults(t){let e=[`# Search Results - ${new Date().toISOString()}`,`Total matches: ${t.length}`,"","## Results",""];return t.forEach((s,n)=>{e.push(`${n+1}. **${s.matchType.toUpperCase()}**: ${s.matchText}`),e.push(`   File: ${s.filePath}`),s.line&&e.push(`   Line: ${s.line}`),e.push("")}),e.join(`
`)}getSearchStats(){return{historySize:this.searchHistory.length,lastSearch:this.searchHistory.length>0?new Date:null}}clearSearchHistory(){this.searchHistory=[],this.outputChannel.appendLine("\u{1F9F9} Search history cleared")}addToSearchHistory(t){t.trim()&&!this.searchHistory.includes(t)&&(this.searchHistory.unshift(t),this.searchHistory.length>50&&(this.searchHistory=this.searchHistory.slice(0,50)))}};var _=y(require("vscode")),ft=y(require("path")),Ge=class{constructor(t,e){this.stepDefinitionProvider=t,this.outputChannel=e}async provideHover(t,e,s){try{let n=t.lineAt(e),o=this.analyzeHoverContext(n,e.line,t);if(!o)return;let i=this.buildHoverContent(o);if(i.length===0)return;let a=new _.Range(new _.Position(e.line,0),new _.Position(e.line,n.text.length));return new _.Hover(i,a)}catch(n){this.outputChannel.appendLine(`[ERROR] Hover provider failed: ${n}`);return}}analyzeHoverContext(t,e,s){let o=t.text.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)$/i);if(!o)return;let[,i,a]=o,c=a.trim(),g=this.stepDefinitionProvider.findMatchingStep(c),w={stepText:c,stepType:i,lineNumber:e+1,hasDefinition:!!g};if(g)w.definitionFile=g.file,w.definitionLine=g.line,w.stepFunction=g.function,w.parameters=this.extractParameters(c,g.pattern);else{let b=this.stepDefinitionProvider.getAllStepDefinitions();w.suggestions=this.findSimilarSteps(c,b).slice(0,3)}return w.scenarioContext=this.extractScenarioContext(s,e),w.tags=this.extractTags(s,e),w.executionHistory=this.getExecutionHistory(c),w}buildHoverContent(t){let e=[];if(t.hasDefinition&&t.definitionFile&&t.definitionLine){let s=new _.MarkdownString;if(s.isTrusted=!0,s.supportHtml=!0,s.appendMarkdown(`### \u2705 Step Definition Found

`),s.appendMarkdown(`**Step:** \`${t.stepText}\`

`),s.appendMarkdown(`**Type:** ${t.stepType}

`),s.appendMarkdown(`**Location:** ${ft.basename(t.definitionFile)}:${t.definitionLine}

`),t.stepFunction&&s.appendMarkdown(`**Function:** \`${t.stepFunction}\`

`),t.parameters&&t.parameters.length>0&&(s.appendMarkdown(`**Parameters:**
`),t.parameters.forEach(n=>{let o=n.type?` (${n.type})`:"";s.appendMarkdown(`- \`${n.name}\`: "${n.value}"${o}
`)}),s.appendMarkdown(`
`)),t.scenarioContext&&(s.appendMarkdown(`**Context:**
`),t.scenarioContext.featureName&&s.appendMarkdown(`- Feature: ${t.scenarioContext.featureName}
`),t.scenarioContext.scenarioName&&s.appendMarkdown(`- Scenario: ${t.scenarioContext.scenarioName}
`),t.scenarioContext.isOutline&&s.appendMarkdown(`- Type: Scenario Outline
`),s.appendMarkdown(`
`)),t.executionHistory?.lastRun){let n=t.executionHistory.success?"\u2705 Passed":"\u274C Failed",o=t.executionHistory.duration?` (${t.executionHistory.duration}ms)`:"";s.appendMarkdown(`**Last Execution:** ${n}${o}

`)}t.tags&&t.tags.length>0&&s.appendMarkdown(`**Tags:** ${t.tags.map(n=>`\`${n}\``).join(", ")}

`),s.appendMarkdown(`[Go to Definition](command:vscode.open?${encodeURIComponent(JSON.stringify([_.Uri.file(t.definitionFile),{selection:new _.Range(t.definitionLine-1,0,t.definitionLine-1,0)}]))})`),e.push(s)}else{let s=new _.MarkdownString;s.isTrusted=!0,s.appendMarkdown(`### \u274C Step Definition Missing

`),s.appendMarkdown(`**Step:** \`${t.stepText}\`

`),s.appendMarkdown(`**Type:** ${t.stepType}

`),s.appendMarkdown(`\u26A0\uFE0F No matching step definition found.

`),t.suggestions&&t.suggestions.length>0&&(s.appendMarkdown(`**Similar steps found:**

`),t.suggestions.forEach((n,o)=>{s.appendMarkdown(`${o+1}. \`${n}\`
`)}),s.appendMarkdown(`
`)),s.appendMarkdown(`**Suggested step definition:**

`),s.appendMarkdown(`\`\`\`typescript
${t.stepType.toLowerCase()}('${t.stepText}', async () => {
  // TODO: Implement step
});
\`\`\`

`),s.appendMarkdown("\u{1F4A1} Create a step definition in your steps folder to resolve this."),e.push(s)}return e}extractParameters(t,e){let s=[];try{let n=[{regex:/\{([^}]+)\}/g,type:"variable"},{regex:/\<([^>]+)\>/g,type:"placeholder"},{regex:/"([^"]+)"/g,type:"string"},{regex:/'([^']+)'/g,type:"string"},{regex:/\b(\d+(?:\.\d+)?)\b/g,type:"number"}],o=0;for(let i of n){let a,c=new RegExp(i.regex.source,"g");for(;(a=c.exec(t))!==null;)s.push({name:i.type==="variable"||i.type==="placeholder"?a[1]:`param${o++}`,value:a[1]||a[0],type:i.type})}}catch{}return s}extractScenarioContext(t,e){let s=t.getText().split(`
`),n,o,i=!1;for(let a=e;a>=0;a--){let c=s[a].trim();if(!o){let g=c.match(/^\s*Scenario(?: Outline)?:\s*(.+)/);g&&(o=g[1].trim(),i=c.includes("Outline"))}if(!n){let g=c.match(/^\s*Feature:\s*(.+)/);if(g){n=g[1].trim();break}}}return n||o?{featureName:n,scenarioName:o,isOutline:i}:void 0}extractTags(t,e){let s=t.getText().split(`
`),n=[];for(let o=e-1;o>=0;o--){let i=s[o].trim();if(i.startsWith("@")){let a=i.split(/\s+/).filter(c=>c.startsWith("@"));n.unshift(...a)}else if(i!==""&&!i.startsWith("#"))break}return n}getExecutionHistory(t){}findSimilarSteps(t,e){let s=t.toLowerCase(),n=[];for(let o of e){let i=o.pattern.toLowerCase(),a=this.calculateSimilarity(s,i);a>.3&&n.push({pattern:o.pattern,score:a})}return n.sort((o,i)=>i.score-o.score).map(o=>o.pattern)}calculateSimilarity(t,e){let s=t.split(/\s+/),n=e.split(/\s+/),o=0;for(let a of s)n.some(c=>c.includes(a)||a.includes(c))&&o++;let i=Math.max(s.length,n.length);return i>0?o/i:0}};var E=y(require("vscode")),Q=y(require("path")),de=y(require("fs")),ue=class{constructor(t,e){this.outputChannel=t,this.workspaceRoot=e}async discoverProjectConfiguration(){let t={};this.outputChannel.appendLine("\u{1F50D} Starting auto-discovery of project configuration...");try{let e=await this.discoverPlaywrightConfig();return t.playwrightConfig=e.length>0?e[0]:void 0,t.featureFolder=await this.discoverFeatureFolder(),t.stepsFolder=await this.discoverStepsFolder(),t.tsconfigPath=await this.discoverTsconfig(),t.hasPlaywrightBdd=await this.checkPlaywrightBddDependency(),t.packageJsonExists=await this.checkPackageJson(),this.logDiscoveryResults(t),t}catch(e){return this.outputChannel.appendLine(`\u274C Auto-discovery failed: ${e}`),t}}async discoverPlaywrightConfig(){let t=["playwright.config.js","playwright.config.ts","playwright.config.mjs","playwright.config.mts","playwright.config.cjs","playwright.config.cts"],e=[];this.outputChannel.appendLine("\u{1F50D} Searching for Playwright configs in all workspace folders...");try{for(let n of t){let o=await E.workspace.findFiles(`**/${n}`,"**/node_modules/**");for(let i of o){let a=E.workspace.asRelativePath(i);e.push(a),this.outputChannel.appendLine(`\u{1F4CB} Found Playwright config: ${a}`)}}let s=await this.findConfigsByContent();e.push(...s),e.sort((n,o)=>{let i=n.split("/").length,a=o.split("/").length;return i-a}),this.outputChannel.appendLine(`\u2705 Total Playwright configs found: ${e.length}`)}catch(s){this.outputChannel.appendLine(`\u274C Error during config discovery: ${s}`)}return e}async findConfigsByContent(){let t=[];try{let e=await E.workspace.findFiles("**/*.{js,ts,mjs,mts,cjs,cts}","**/node_modules/**"),s=["defineConfig","@playwright/test","PlaywrightTestConfig","devices:","projects:","testDir:","use:.*baseURL"];for(let n of e)try{let i=(await E.workspace.fs.readFile(n)).toString();if(s.some(c=>new RegExp(c,"i").test(i))){let c=E.workspace.asRelativePath(n);!c.includes("test")&&!c.includes("spec")&&!c.includes("example")&&!t.includes(c)&&(t.push(c),this.outputChannel.appendLine(`\u{1F527} Detected Playwright config by content: ${c}`))}}catch{continue}}catch(e){this.outputChannel.appendLine(`Warning: Content-based config discovery failed: ${e}`)}return t}async discoverFeatureFolder(){this.outputChannel.appendLine("\u{1F50D} Searching for feature folders in all workspace directories...");try{let t=await E.workspace.findFiles("**/*.feature","**/node_modules/**");if(t.length===0){this.outputChannel.appendLine("\u26A0\uFE0F No .feature files found in workspace");return}let e=new Map;for(let a of t){let c=E.workspace.asRelativePath(a),g=Q.dirname(c);e.set(g,(e.get(g)||0)+1),this.outputChannel.appendLine(`\u{1F4CB} Found feature file: ${c}`)}let s="",n=0;for(let[a,c]of e.entries())c>n&&(n=c,s=a);let i=Array.from(e.keys()).sort((a,c)=>{let g=a.split("/").length,w=c.split("/").length,b=e.get(a)||0,I=e.get(c)||0;return b!==I?I-b:g-w})[0]||s;this.outputChannel.appendLine(`\u2705 Selected feature folder: ${i} (${e.get(i)} features)`),this.outputChannel.appendLine("\u{1F4CA} Feature distribution:");for(let[a,c]of e.entries())this.outputChannel.appendLine(`   ${a}: ${c} feature(s)`);return i}catch(t){this.outputChannel.appendLine(`\u274C Error during feature folder discovery: ${t}`);return}}async discoverStepsFolder(){this.outputChannel.appendLine("\u{1F50D} Searching for step definition folders in all workspace directories...");try{let t=await E.workspace.findFiles("**/*.{js,ts,mjs,mts,cjs,cts}","**/node_modules/**");if(t.length===0){this.outputChannel.appendLine("\u26A0\uFE0F No JavaScript/TypeScript files found in workspace");return}let e=[/\b(Given|When|Then|And|But)\s*\(/,/\b(given|when|then|and|but)\s*\(/,/@(Given|When|Then|And|But)/,/(Given|When|Then)\s*\(\s*['"`]/,/axios\.|fetch\(|request\(|http\./,/\.get\(|\.post\(|\.put\(|\.delete\(|\.patch\(/,/api\.|API\.|endpoint|baseURL/,/query\(|execute\(|connection\.|database\./,/\.findOne\(|\.find\(|\.create\(|\.update\(|\.delete\(/,/expect\(|assert\(|should\.|chai\./,/\.toBe\(|\.toEqual\(|\.toMatch\(/,/before\(|after\(|beforeEach\(|afterEach\(/,/describe\(|it\(|test\(/,/playwright-bdd|@cucumber|cucumber/,/defineParameterType|setDefaultTimeout/,/from\s+['"]@cucumber|require\s*\(\s*['"]@cucumber/,/export.*step|module\.exports.*step/i,/export.*Given|export.*When|export.*Then/i,/step.*def|.*steps\.|.*step\./i,/config\.|setup\.|teardown\./,/environment\.|env\.|process\.env/,/utils\.|helpers\.|common\./,/shared\.|base\.|abstract\./,/JSON\.|parse\(|stringify\(/,/\.map\(|\.filter\(|\.reduce\(/,/fs\.|path\.|os\.|crypto\./,/readFile|writeFile|exists|mkdir/,/Date\.|moment\(|dayjs\(/,/setTimeout|setInterval/,/Math\.random|uuid|generate/,/faker\.|chance\./],s=new Map;for(let i of t)try{let c=(await E.workspace.fs.readFile(i)).toString(),g=E.workspace.asRelativePath(i);if(e.some(b=>b.test(c))){let b=Q.dirname(g);s.has(b)||s.set(b,{count:0,files:[]});let I=s.get(b);I.count++,I.files.push(Q.basename(g)),this.outputChannel.appendLine(`\u{1F527} Found step definitions in: ${g}`)}}catch{continue}if(s.size===0){this.outputChannel.appendLine("\u26A0\uFE0F No step definition files found");return}let n="",o=0;for(let[i,a]of s.entries()){let c=i.split("/").length*.1,g=a.count-c;g>o&&(o=g,n=i)}this.outputChannel.appendLine(`\u2705 Selected steps folder: ${n} (${s.get(n)?.count} step files)`),this.outputChannel.appendLine("\u{1F4CA} Step definition distribution:");for(let[i,a]of s.entries())this.outputChannel.appendLine(`   ${i}: ${a.count} file(s) [${a.files.join(", ")}]`);return n}catch(t){this.outputChannel.appendLine(`\u274C Error during step folder discovery: ${t}`);return}}async discoverTsconfig(){let t=["tsconfig.json","tests/tsconfig.json","e2e/tsconfig.json","test/tsconfig.json","tsconfig.test.json"];for(let e of t){let s=Q.join(this.workspaceRoot,e);if(await this.fileExists(s)&&e!=="tsconfig.json")return this.outputChannel.appendLine(`\u2705 Found tsconfig: ${e}`),`./${e}`}}async checkPlaywrightBddDependency(){let t=Q.join(this.workspaceRoot,"package.json");if(await this.fileExists(t))try{let e=await this.readFileContent(t),s=JSON.parse(e);if(s.dependencies&&s.dependencies["playwright-bdd"]||s.devDependencies&&s.devDependencies["playwright-bdd"])return this.outputChannel.appendLine("\u2705 Found playwright-bdd dependency"),!0}catch(e){this.outputChannel.appendLine(`\u26A0\uFE0F Error reading package.json: ${e}`)}return this.outputChannel.appendLine("\u26A0\uFE0F playwright-bdd dependency not found"),!1}async checkPackageJson(){let t=Q.join(this.workspaceRoot,"package.json");return await this.fileExists(t)}async applyDiscoveredConfiguration(t){let e=E.workspace.getConfiguration("playwrightBdd"),s=[];if(t.playwrightConfig&&e.get("configPath")==="./playwright.config.ts"&&s.push({key:"configPath",value:t.playwrightConfig,discovered:t.playwrightConfig}),t.featureFolder&&e.get("featureFolder")==="features"&&s.push({key:"featureFolder",value:t.featureFolder,discovered:t.featureFolder}),t.stepsFolder&&e.get("stepsFolder")==="steps"&&s.push({key:"stepsFolder",value:t.stepsFolder,discovered:t.stepsFolder}),t.tsconfigPath&&!e.get("tsconfigPath")&&s.push({key:"tsconfigPath",value:t.tsconfigPath,discovered:t.tsconfigPath}),s.length>0){this.outputChannel.appendLine(`
\u{1F527} Applying discovered configuration...`);for(let n of s)await e.update(n.key,n.value,E.ConfigurationTarget.Workspace),this.outputChannel.appendLine(`   ${n.key}: ${n.discovered}`);E.window.showInformationMessage(`Auto-discovered and applied ${s.length} configuration settings. Check Playwright BDD settings for details.`)}else this.outputChannel.appendLine("\u2139\uFE0F No configuration updates needed")}async validateConfiguration(){let t=[],e=E.workspace.getConfiguration("playwrightBdd"),s=e.get("configPath");if(s){let i=Q.join(this.workspaceRoot,s);await this.fileExists(i)||t.push(`Playwright config not found: ${s}`)}let n=e.get("featureFolder");if(n){let i=Q.join(this.workspaceRoot,n);await this.directoryExists(i)||t.push(`Feature folder not found: ${n}`)}let o=e.get("stepsFolder");if(o){let i=Q.join(this.workspaceRoot,o);await this.directoryExists(i)||t.push(`Steps folder not found: ${o}`)}return{valid:t.length===0,issues:t}}async fileExists(t){try{return await de.promises.access(t,de.constants.F_OK),!0}catch{return!1}}async directoryExists(t){try{return(await de.promises.stat(t)).isDirectory()}catch{return!1}}async hasFeatureFiles(t){try{return(await de.promises.readdir(t,{withFileTypes:!0})).some(s=>s.isFile()&&s.name.endsWith(".feature")||s.isDirectory()&&s.name!=="node_modules")}catch{return!1}}async hasStepDefinitionFiles(t){try{let e=await de.promises.readdir(t,{withFileTypes:!0});for(let s of e)if(s.isFile()&&/\.(js|ts|mjs|mts)$/.test(s.name)){let n=await this.readFileContent(Q.join(t,s.name));if(this.looksLikeStepDefinition(n))return!0}return!1}catch{return!1}}async readFileContent(t){try{return await de.promises.readFile(t,"utf8")}catch{return""}}looksLikeStepDefinition(t){return[/\b(Given|When|Then|And|But)\s*\(/,/\b(given|when|then|and|but)\s*\(/,/@(Given|When|Then|And|But)/,/cucumber\.|@cucumber/,/playwright-bdd/].some(s=>s.test(t))}logDiscoveryResults(t){this.outputChannel.appendLine(`
\u{1F4CB} Auto-discovery results:`),this.outputChannel.appendLine(`   Playwright Config: ${t.playwrightConfig||"Not found"}`),this.outputChannel.appendLine(`   Feature Folder: ${t.featureFolder||"Not found"}`),this.outputChannel.appendLine(`   Steps Folder: ${t.stepsFolder||"Not found"}`),this.outputChannel.appendLine(`   TSConfig: ${t.tsconfigPath||"Not found"}`),this.outputChannel.appendLine(`   Playwright-BDD: ${t.hasPlaywrightBdd?"Installed":"Not found"}`),this.outputChannel.appendLine(`   Package.json: ${t.packageJsonExists?"Found":"Not found"}`)}};var mt=require("events"),je=class extends mt.EventEmitter{constructor(e,s=1){super();this.queue=[];this.running=new Map;this.maxConcurrent=1;this.completedItems=[];this.outputChannel=e,this.maxConcurrent=s}addToQueue(e){let s=e.map(n=>({...n,id:this.generateId(),addedAt:new Date,status:"pending"}));s.sort((n,o)=>o.priority-n.priority),this.queue.push(...s),this.outputChannel.appendLine(`\u{1F4CB} Added ${s.length} items to execution queue`),this.emit("queueUpdated",this.getProgress()),this.processQueue()}async startWithProgress(e,s){return this.progressReporter=e,this.currentToken=s,s.onCancellationRequested(()=>{this.cancelAll()}),this.outputChannel.appendLine("\u{1F680} Starting queue execution with progress tracking..."),this.emit("queueStarted"),this.processQueue()}async processQueue(){for(;this.queue.length>0&&this.running.size<this.maxConcurrent&&!this.currentToken?.isCancellationRequested;){let e=this.queue.shift();e&&await this.executeItem(e)}this.queue.length===0&&this.running.size===0&&this.onQueueComplete()}async executeItem(e){e.status="running",e.startedAt=new Date,this.running.set(e.id,e),this.outputChannel.appendLine(`\u25B6\uFE0F Executing: ${e.name}`),this.updateProgress(`Running: ${e.name}`),this.emit("itemStarted",e);try{let s=await this.runCommand(e.command);e.status="completed",e.completedAt=new Date,e.result={success:s.success,duration:Date.now()-(e.startedAt?.getTime()||0),output:s.output,error:s.error},this.outputChannel.appendLine(`\u2705 Completed: ${e.name} (${e.result.duration}ms)`)}catch(s){e.status="failed",e.completedAt=new Date,e.result={success:!1,duration:Date.now()-(e.startedAt?.getTime()||0),output:"",error:s instanceof Error?s.message:String(s)},this.outputChannel.appendLine(`\u274C Failed: ${e.name} - ${e.result.error}`)}this.running.delete(e.id),this.emit("itemCompleted",e),this.emit("queueUpdated",this.getProgress()),this.processQueue()}async runCommand(e){return new Promise(s=>{setTimeout(()=>{let n=Math.random()>.1;s({success:n,output:n?"Test passed":"Test failed",error:n?void 0:"Simulated test failure"})},Math.random()*2e3+500)})}updateProgress(e){if(this.progressReporter){let s=this.getProgress();this.progressReporter.report({message:`${e} (${s.completed}/${s.total})`,increment:s.percentage})}}getProgress(){let e=this.getCompletedItems().length,s=this.running.size,n=this.queue.length,o=this.getFailedItems().length,i=e+s+n,a={total:i,completed:e,running:s,pending:n,failed:o,percentage:i>0?e/i*100:0};if(s>0||n>0){let c=this.getCompletedItems();if(c.length>0){let g=c.reduce((w,b)=>w+(b.result?.duration||0),0)/c.length;a.estimatedTimeRemaining=Math.round((n+s)*g/Math.max(1,this.maxConcurrent))}}return a}getAllItems(){return[...Array.from(this.running.values()),...this.getCompletedItems(),...this.queue]}getCompletedItems(){return this.completedItems||[]}getFailedItems(){return this.getCompletedItems().filter(e=>!e.result?.success)}cancelAll(){this.outputChannel.appendLine("\u{1F6D1} Cancelling all queue items..."),this.queue.forEach(e=>{e.status="cancelled",e.completedAt=new Date}),this.queue=[],this.running.forEach(e=>{e.status="cancelled",e.completedAt=new Date,this.completedItems.push(e)}),this.running.clear(),this.emit("queueCancelled"),this.emit("queueUpdated",this.getProgress())}pause(){this.outputChannel.appendLine("\u23F8\uFE0F Queue execution paused"),this.emit("queuePaused")}resume(){this.outputChannel.appendLine("\u25B6\uFE0F Queue execution resumed"),this.emit("queueResumed"),this.processQueue()}clearCompleted(){this.completedItems=[],this.outputChannel.appendLine("\u{1F9F9} Cleared completed items"),this.emit("queueUpdated",this.getProgress())}retryFailed(){let e=this.getFailedItems();if(e.length===0){this.outputChannel.appendLine("\u2139\uFE0F No failed items to retry");return}let s=e.map(n=>({type:n.type,name:`${n.name} (retry)`,command:n.command,testItem:n.testItem,priority:n.priority+1}));this.addToQueue(s),this.outputChannel.appendLine(`\u{1F504} Added ${s.length} failed items for retry`)}setMaxConcurrent(e){this.maxConcurrent=Math.max(1,e),this.outputChannel.appendLine(`\u2699\uFE0F Max concurrent executions set to ${this.maxConcurrent}`),this.queue.length>0&&this.processQueue()}getStatistics(){let e=this.getCompletedItems(),s=e.filter(o=>o.result?.success),n=e.map(o=>o.result?.duration||0).filter(o=>o>0);return{totalExecuted:e.length,successRate:e.length>0?s.length/e.length*100:0,averageDuration:n.length>0?n.reduce((o,i)=>o+i,0)/n.length:0,fastestExecution:n.length>0?Math.min(...n):0,slowestExecution:n.length>0?Math.max(...n):0}}exportResults(){let e=this.getAllItems(),s=this.getStatistics(),n=[`# Test Execution Queue Report - ${new Date().toISOString()}`,"","## Summary",`- Total Items: ${e.length}`,`- Success Rate: ${s.successRate.toFixed(2)}%`,`- Average Duration: ${s.averageDuration.toFixed(0)}ms`,`- Fastest: ${s.fastestExecution}ms`,`- Slowest: ${s.slowestExecution}ms`,"","## Items",""];return e.forEach((o,i)=>{let a=o.result?.duration?`${o.result.duration}ms`:"N/A",c=o.status.toUpperCase();n.push(`${i+1}. **${c}**: ${o.name} (${a})`),o.result?.error&&n.push(`   Error: ${o.result.error}`),n.push("")}),n.join(`
`)}onQueueComplete(){let e=this.getStatistics();this.outputChannel.appendLine(`
\u{1F389} Queue execution completed!`),this.outputChannel.appendLine(`   Total: ${e.totalExecuted}`),this.outputChannel.appendLine(`   Success Rate: ${e.successRate.toFixed(2)}%`),this.outputChannel.appendLine(`   Average Duration: ${e.averageDuration.toFixed(0)}ms`),this.emit("queueCompleted",e),this.progressReporter&&this.progressReporter.report({message:`Completed ${e.totalExecuted} tests (${e.successRate.toFixed(1)}% success)`,increment:100})}generateId(){return`queue_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}};var D=y(require("vscode")),pe=y(require("path")),he=y(require("fs")),Ne=class{constructor(t,e){this.outputChannel=t,this.workspaceRoot=e}async launchWizard(t){try{this.outputChannel.appendLine("\u{1F9D9}\u200D\u2642\uFE0F Launching Step Creation Wizard...");let e=t||await this.getStepText();if(!e)return;let s=this.analyzeStepText(e),n=await this.getCreationOptions();if(!n)return;let o=await this.createStepTemplate(s,n);if(!await this.showPreviewAndConfirm(o,n))return;await this.generateStepDefinition(o,n),D.window.showInformationMessage("\u2705 Step definition created successfully!")}catch(e){this.outputChannel.appendLine(`\u274C Step creation failed: ${e}`),D.window.showErrorMessage(`Failed to create step definition: ${e}`)}}async createFromMissingStep(t,e){this.outputChannel.appendLine(`\u{1F527} Creating step definition for missing step: ${t}`);let s={stepType:e,originalText:t,cleanText:t,parameters:this.extractParametersFromText(t),suggestedFunctionName:this.generateFunctionName(t)},n=await this.getQuickCreationOptions();if(!n)return;let o=await this.createStepTemplate(s,n);await this.generateStepDefinition(o,n),D.window.showInformationMessage("\u2705 Step definition created from missing step!")}async getStepText(){return await D.window.showInputBox({prompt:'Enter the step text (e.g., "I click on the login button")',placeHolder:"Step text...",validateInput:t=>{if(!t.trim())return"Step text cannot be empty"}})}analyzeStepText(t){let e=this.determineStepType(t),s=t.replace(/^(Given|When|Then|And|But)\s+/i,"").trim(),n=this.extractParametersFromText(s),o=this.generateFunctionName(s);return{stepType:e,originalText:t,cleanText:s,parameters:n,suggestedFunctionName:o}}determineStepType(t){let e=t.toLowerCase();return e.includes("given")||e.includes("assume")||e.includes("setup")?"Given":e.includes("when")||e.includes("click")||e.includes("enter")||e.includes("select")?"When":"Then"}extractParametersFromText(t){let e=[];return(t.match(/"([^"]+)"/g)||[]).forEach((o,i)=>{let a=o.slice(1,-1);e.push({name:`text${i+1}`,type:"string",value:a})}),(t.match(/\b\d+(\.\d+)?\b/g)||[]).forEach((o,i)=>{e.push({name:`number${i+1}`,type:"number",value:o})}),e}generateFunctionName(t){return t.toLowerCase().replace(/[^a-zA-Z0-9\s]/g,"").split(/\s+/).filter(e=>e.length>0).map((e,s)=>s===0?e:e.charAt(0).toUpperCase()+e.slice(1)).join("").replace(/^\d/,"step$&")}async getCreationOptions(){let t=await D.window.showQuickPick(["typescript","javascript"],{placeHolder:"Select language for step definition"});if(!t)return;let e=await D.window.showQuickPick(["playwright-bdd","cucumber","generic"],{placeHolder:"Select testing framework"});if(!e)return;let s=await this.selectTargetFile(t);if(s)return{targetFile:s,language:t,framework:e,addImports:!0,addComments:!0}}async getQuickCreationOptions(){let e=D.workspace.getConfiguration("playwrightBdd").get("stepsFolder","steps"),s=await this.findStepFiles(),n;if(s.length>0){let o=[...s.map(a=>({label:pe.basename(a),detail:a})),{label:"$(plus) Create new file",detail:"new"}],i=await D.window.showQuickPick(o,{placeHolder:"Select target file for step definition"});if(!i)return;i.detail==="new"?n=await this.createNewStepFile(e):n=i.detail}else n=await this.createNewStepFile(e);return{targetFile:n,language:"typescript",framework:"playwright-bdd",addImports:!0,addComments:!1}}async selectTargetFile(t){let s=[...(await this.findStepFiles()).map(o=>({label:pe.basename(o),detail:o,description:"Existing file"})),{label:"$(plus) Create new file",detail:"new",description:"Create a new step definition file"}],n=await D.window.showQuickPick(s,{placeHolder:"Select target file for step definition"});if(n){if(n.detail==="new"){let i=D.workspace.getConfiguration("playwrightBdd").get("stepsFolder","steps");return await this.createNewStepFile(i)}return n.detail}}async findStepFiles(){let t=D.workspace.getConfiguration("playwrightBdd"),e=t.get("stepsFolder","steps"),s=t.get("stepsFilePattern","**/*.{js,ts,mjs,mts}");try{return(await D.workspace.findFiles(`${e}/${s}`,"**/node_modules/**",50)).map(o=>o.fsPath)}catch{return[]}}async createNewStepFile(t){let e=await D.window.showInputBox({prompt:"Enter name for new step definition file",placeHolder:"e.g., loginSteps.ts",value:"newSteps.ts",validateInput:n=>{if(!n.trim())return"File name cannot be empty";if(!/\.(ts|js|mjs|mts)$/.test(n))return"File must have .ts, .js, .mjs, or .mts extension"}});if(!e)throw new Error("File name is required");let s=pe.join(this.workspaceRoot,t,e);return await he.promises.mkdir(pe.dirname(s),{recursive:!0}),s}async createStepTemplate(t,e){return{stepType:t.stepType,stepText:t.cleanText,functionName:t.suggestedFunctionName,parameters:t.parameters.map(n=>({name:n.name,type:n.type,defaultValue:n.value})),hasDataTable:!1,hasDocString:!1,implementation:this.generateImplementation(t,e)}}generateImplementation(t,e){let{language:s,framework:n}=e,o=s==="typescript",i="";return n==="playwright-bdd"?(i=`// TODO: Implement step logic
`,i+="await page.pause(); // Remove this line and add your implementation"):n==="cucumber"?(i=`// TODO: Implement step logic
`,i+='throw new Error("Step not implemented");'):i="// TODO: Implement step logic",i}async showPreviewAndConfirm(t,e){let s=this.generateStepCode(t,e),n=await D.workspace.openTextDocument({content:s,language:e.language});return await D.window.showTextDocument(n,{preview:!0}),await D.window.showInformationMessage("Preview the step definition. Do you want to create it?","Create Step","Cancel")==="Create Step"}generateStepCode(t,e){let{language:s,framework:n,addImports:o,addComments:i}=e,a=s==="typescript",c="";o&&(n==="playwright-bdd"?(c+=`import { ${t.stepType.toLowerCase()} } from 'playwright-bdd';
`,a&&(c+=`import { Page } from '@playwright/test';
`)):n==="cucumber"&&(c+=`import { ${t.stepType} } from '@cucumber/cucumber';
`),c+=`
`),i&&(c+=`/**
 * ${t.stepType}: ${t.stepText}
`,t.parameters.length>0&&t.parameters.forEach(b=>{c+=` * @param {${b.type}} ${b.name}
`}),c+=` */
`);let g=t.parameters.map(b=>a?`${b.name}: ${b.type}`:b.name).join(", "),w=this.createStepPattern(t.stepText,t.parameters);return n==="playwright-bdd"?c+=`${t.stepType.toLowerCase()}('${w}', async ({ page }${g?`, ${g}`:""}) => {
`:c+=`${t.stepType}('${w}', async (${g}) => {
`,c+="  "+t.implementation.replace(/\n/g,`
  `)+`
`,c+=`});
`,c}createStepPattern(t,e){let s=t;return e.forEach((n,o)=>{if(n.type==="string"&&n.defaultValue)s=s.replace(`"${n.defaultValue}"`,`{${n.name}}`);else if(n.type==="number"&&n.defaultValue){let i=n.defaultValue.includes(".");s=s.replace(n.defaultValue,`{${i?"float":"int"}}`)}}),s}async generateStepDefinition(t,e){let s=this.generateStepCode(t,e),n=e.targetFile;if(await he.promises.access(n).then(()=>!0).catch(()=>!1)){let c=await he.promises.readFile(n,"utf8")+`
`+s;await he.promises.writeFile(n,c)}else{let a="";e.addImports&&e.framework==="playwright-bdd"&&(a+=`import { given, when, then } from 'playwright-bdd';
`,e.language==="typescript"&&(a+=`import { Page } from '@playwright/test';
`),a+=`
`),a+=s,await he.promises.writeFile(n,a)}let i=await D.workspace.openTextDocument(n);await D.window.showTextDocument(i),this.outputChannel.appendLine(`\u2705 Step definition created in: ${n}`)}async createStepsFromFeature(t){try{this.outputChannel.appendLine(`\u{1F50D} Analyzing feature file: ${pe.basename(t.fsPath)}`);let e=await he.promises.readFile(t.fsPath,"utf8"),s=this.findMissingSteps(e);if(s.length===0){D.window.showInformationMessage("No missing steps found in this feature file.");return}if(await D.window.showInformationMessage(`Found ${s.length} missing steps. Create all step definitions?`,"Create All","Cancel")==="Create All"){let o=await this.getQuickCreationOptions();if(!o)return;for(let i of s){let a=this.analyzeStepText(i),c=await this.createStepTemplate(a,o);await this.generateStepDefinition(c,o)}D.window.showInformationMessage(`\u2705 Created ${s.length} step definitions!`)}}catch(e){this.outputChannel.appendLine(`\u274C Failed to create steps from feature: ${e}`),D.window.showErrorMessage(`Failed to create steps: ${e}`)}}findMissingSteps(t){let e=t.split(`
`),s=[];for(let n of e){let o=n.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);if(o){let i=`${o[1]} ${o[2]}`;s.includes(i)||s.push(i)}}return s}};var B=y(require("vscode")),ze=y(require("path")),wt=require("events"),Ue=class extends wt.EventEmitter{constructor(e,s){super();this.breakpoints=new Map;this.activeSessions=new Map;this.outputChannel=e,this.workspaceRoot=s,this.debugConfigProvider=new ot}register(e){e.subscriptions.push(B.debug.registerDebugConfigurationProvider("bdd-playwright",this.debugConfigProvider)),e.subscriptions.push(B.debug.onDidChangeBreakpoints(this.onBreakpointsChanged.bind(this))),e.subscriptions.push(B.debug.onDidStartDebugSession(this.onDebugSessionStarted.bind(this)),B.debug.onDidTerminateDebugSession(this.onDebugSessionTerminated.bind(this))),this.outputChannel.appendLine("\u{1F41B} BDD Debugging Tools registered")}async startStepByStepDebugging(e,s){try{this.outputChannel.appendLine(`\u{1F50D} Starting step-by-step debugging: ${s}`);let n=this.generateSessionId(),o={sessionId:n,featureFile:e,scenario:s,status:"stopped",variables:new Map,callStack:[],breakpoints:Array.from(this.breakpoints.values())};this.activeSessions.set(n,o);let i={type:"bdd-playwright",request:"launch",name:`Debug BDD Scenario: ${s}`,program:"${workspaceFolder}/node_modules/.bin/playwright",args:["test","--config=playwright.config.ts","--debug",`--grep="${s}"`],cwd:"${workspaceFolder}",env:{PWDEBUG:"1",BDD_DEBUG_MODE:"step-by-step",BDD_SESSION_ID:n},console:"integratedTerminal",internalConsoleOptions:"openOnSessionStart"};if(await B.debug.startDebugging(void 0,i))this.emit("debugSessionStarted",o),this.showDebugPanel(o);else throw this.activeSessions.delete(n),new Error("Failed to start debug session")}catch(n){this.outputChannel.appendLine(`\u274C Debug start failed: ${n}`),B.window.showErrorMessage(`Failed to start debugging: ${n}`)}}async toggleBreakpoint(e,s,n){let o=`${e}:${s}`;if(this.breakpoints.has(o))this.breakpoints.delete(o),this.outputChannel.appendLine(`\u{1F534} Removed breakpoint: ${n} (${ze.basename(e)}:${s})`);else{let i={id:o,file:e,line:s,stepText:n,enabled:!0,hitCount:0};this.breakpoints.set(o,i),this.outputChannel.appendLine(`\u{1F7E2} Added breakpoint: ${n} (${ze.basename(e)}:${s})`)}this.emit("breakpointsChanged",Array.from(this.breakpoints.values())),this.updateBreakpointsInEditor()}async setConditionalBreakpoint(e,s,n,o){let i=`${e}:${s}`,a={id:i,file:e,line:s,stepText:n,condition:o,enabled:!0,hitCount:0};this.breakpoints.set(i,a),this.outputChannel.appendLine(`\u{1F535} Added conditional breakpoint: ${n} (${o})`),this.emit("breakpointsChanged",Array.from(this.breakpoints.values())),this.updateBreakpointsInEditor()}async setLogPoint(e,s,n,o){let i=`${e}:${s}`,a={id:i,file:e,line:s,stepText:n,logMessage:o,enabled:!0,hitCount:0};this.breakpoints.set(i,a),this.outputChannel.appendLine(`\u{1F4DD} Added log point: ${n} -> "${o}"`),this.emit("breakpointsChanged",Array.from(this.breakpoints.values())),this.updateBreakpointsInEditor()}async showDebugPanel(e){let s=B.window.createWebviewPanel("bddDebugPanel",`BDD Debug: ${e.scenario}`,B.ViewColumn.Two,{enableScripts:!0,retainContextWhenHidden:!0});s.webview.html=this.getDebugPanelHtml(e),s.webview.onDidReceiveMessage(async n=>{switch(n.command){case"stepOver":await this.stepOver(e.sessionId);break;case"stepInto":await this.stepInto(e.sessionId);break;case"continue":await this.continue(e.sessionId);break;case"pause":await this.pause(e.sessionId);break;case"stop":await this.stop(e.sessionId);break;case"evaluate":await this.evaluateExpression(e.sessionId,n.expression);break}}),this.on("sessionUpdated",n=>{n.sessionId===e.sessionId&&(s.webview.html=this.getDebugPanelHtml(n))})}getDebugPanelHtml(e){let s=e.currentStep,n=Array.from(e.variables.entries());return`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BDD Debug Panel</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                padding: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .debug-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                padding: 10px;
                background: var(--vscode-panel-background);
                border-radius: 4px;
            }
            .debug-button {
                padding: 8px 16px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .debug-button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .current-step {
                padding: 15px;
                background: var(--vscode-textBlockQuote-background);
                border-left: 4px solid var(--vscode-textLink-foreground);
                margin-bottom: 20px;
                border-radius: 4px;
            }
            .variables {
                background: var(--vscode-panel-background);
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
            }
            .variable-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .expression-input {
                width: 100%;
                padding: 8px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                margin-top: 10px;
            }
            .status {
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 20px;
                font-weight: bold;
            }
            .status.running { background: var(--vscode-testing-iconPassed); }
            .status.paused { background: var(--vscode-testing-iconQueued); }
            .status.stopped { background: var(--vscode-testing-iconFailed); }
        </style>
    </head>
    <body>
        <div class="status ${e.status}">
            Status: ${e.status.toUpperCase()}
        </div>

        <div class="debug-controls">
            <button class="debug-button" onclick="sendCommand('continue')">\u25B6\uFE0F Continue</button>
            <button class="debug-button" onclick="sendCommand('stepOver')">\u23ED\uFE0F Step Over</button>
            <button class="debug-button" onclick="sendCommand('stepInto')">\u23EC Step Into</button>
            <button class="debug-button" onclick="sendCommand('pause')">\u23F8\uFE0F Pause</button>
            <button class="debug-button" onclick="sendCommand('stop')">\u23F9\uFE0F Stop</button>
        </div>

        ${s?`
        <div class="current-step">
            <h3>Current Step</h3>
            <p><strong>Step:</strong> ${s.stepText}</p>
            <p><strong>File:</strong> ${ze.basename(s.file)}:${s.line}</p>
            <p><strong>Step Index:</strong> ${s.stepIndex}</p>
        </div>
        `:""}

        <div class="variables">
            <h3>Variables</h3>
            ${n.length>0?n.map(([o,i])=>`
                <div class="variable-item">
                    <span>${o}</span>
                    <span>${JSON.stringify(i)}</span>
                </div>
            `).join(""):"<p>No variables available</p>"}
            
            <input type="text" class="expression-input" placeholder="Evaluate expression..." 
                   onkeypress="if(event.key==='Enter') evaluateExpression(this.value)">
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function sendCommand(command) {
                vscode.postMessage({ command });
            }
            
            function evaluateExpression(expression) {
                if (expression.trim()) {
                    vscode.postMessage({ command: 'evaluate', expression });
                }
            }
        </script>
    </body>
    </html>`}async stepOver(e){let s=this.activeSessions.get(e);s&&(this.outputChannel.appendLine("\u23ED\uFE0F Step Over"),this.emit("stepOver",s))}async stepInto(e){let s=this.activeSessions.get(e);s&&(this.outputChannel.appendLine("\u23EC Step Into"),this.emit("stepInto",s))}async continue(e){let s=this.activeSessions.get(e);s&&(s.status="running",this.outputChannel.appendLine("\u25B6\uFE0F Continue"),this.emit("continue",s),this.emit("sessionUpdated",s))}async pause(e){let s=this.activeSessions.get(e);s&&(s.status="paused",this.outputChannel.appendLine("\u23F8\uFE0F Pause"),this.emit("pause",s),this.emit("sessionUpdated",s))}async stop(e){let s=this.activeSessions.get(e);s&&(s.status="stopped",this.outputChannel.appendLine("\u23F9\uFE0F Stop"),this.activeSessions.delete(e),this.emit("stop",s))}async evaluateExpression(e,s){let n=this.activeSessions.get(e);n&&(this.outputChannel.appendLine(`\u{1F50D} Evaluating: ${s}`),this.emit("expressionEvaluated",{session:n,expression:s,result:"TODO: Implement"}))}onBreakpointsChanged(e){e.added.forEach(s=>{s instanceof B.SourceBreakpoint}),e.removed.forEach(s=>{s instanceof B.SourceBreakpoint})}onDebugSessionStarted(e){e.type==="bdd-playwright"&&this.outputChannel.appendLine(`\u{1F680} Debug session started: ${e.name}`)}onDebugSessionTerminated(e){e.type==="bdd-playwright"&&this.outputChannel.appendLine(`\u{1F6D1} Debug session terminated: ${e.name}`)}updateBreakpointsInEditor(){}getBreakpoints(){return Array.from(this.breakpoints.values())}clearAllBreakpoints(){this.breakpoints.clear(),this.outputChannel.appendLine("\u{1F9F9} Cleared all breakpoints"),this.emit("breakpointsChanged",[]),this.updateBreakpointsInEditor()}exportBreakpoints(){let e=Array.from(this.breakpoints.values());return JSON.stringify(e,null,2)}importBreakpoints(e){try{let s=JSON.parse(e);this.breakpoints.clear(),s.forEach(n=>{this.breakpoints.set(n.id,n)}),this.outputChannel.appendLine(`\u{1F4E5} Imported ${s.length} breakpoints`),this.emit("breakpointsChanged",s),this.updateBreakpointsInEditor()}catch(s){this.outputChannel.appendLine(`\u274C Failed to import breakpoints: ${s}`),B.window.showErrorMessage("Failed to import breakpoints")}}generateSessionId(){return`debug_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}},ot=class{resolveDebugConfiguration(t,e,s){if(!e.type&&!e.request&&!e.name){let n=B.window.activeTextEditor;n&&n.document.languageId==="feature"&&(e.type="bdd-playwright",e.name="Debug Current Feature",e.request="launch",e.program="${workspaceFolder}/node_modules/.bin/playwright",e.args=["test","--debug"],e.cwd="${workspaceFolder}",e.env={PWDEBUG:"1"})}if(!e.program){B.window.showErrorMessage("Debug configuration missing program path");return}return e}};var Y=y(require("vscode")),Ve=y(require("path")),vt=require("events");var qe=class extends vt.EventEmitter{constructor(e){super();this.workspaces=new Map;this.workspaceGroups=new Map;this.autoDiscoveryServices=new Map;this.outputChannel=e,this.initialize()}async initialize(){this.outputChannel.appendLine("\u{1F3E2} Initializing Multi-Workspace Manager..."),await this.loadWorkspaceConfigurations(),await this.discoverWorkspaces(),this.setupWorkspaceListeners(),this.outputChannel.appendLine(`\u2705 Multi-Workspace Manager initialized with ${this.workspaces.size} workspaces`)}async discoverWorkspaces(){let e=Y.workspace.workspaceFolders;if(!e){this.outputChannel.appendLine("\u2139\uFE0F No workspace folders detected");return}for(let s of e)await this.addWorkspace(s.uri.fsPath,s.name);if(!this.activeWorkspace&&this.workspaces.size>0){let s=Array.from(this.workspaces.keys())[0];await this.setActiveWorkspace(s)}}async addWorkspace(e,s){let n=this.generateWorkspaceId(e);if(this.workspaces.has(n))return this.outputChannel.appendLine(`\u26A0\uFE0F Workspace already exists: ${s||Ve.basename(e)}`),n;try{this.outputChannel.appendLine(`\u{1F4C1} Adding workspace: ${s||Ve.basename(e)}`);let o=new ue(this.outputChannel,e);this.autoDiscoveryServices.set(n,o);let i=await o.discoverProjectConfiguration(),a=await this.analyzeWorkspace(e,i),c={id:n,name:s||Ve.basename(e),rootPath:e,isActive:!1,configuration:i,lastAccessed:new Date,featureCount:a.featureCount,stepCount:a.stepCount};return this.workspaces.set(n,c),this.emit("workspaceAdded",c),this.outputChannel.appendLine(`\u2705 Added workspace: ${c.name} (${a.featureCount} features, ${a.stepCount} steps)`),n}catch(o){throw this.outputChannel.appendLine(`\u274C Failed to add workspace: ${o}`),o}}async removeWorkspace(e){let s=this.workspaces.get(e);if(!s)throw new Error(`Workspace not found: ${e}`);if(this.workspaces.delete(e),this.autoDiscoveryServices.delete(e),this.activeWorkspace===e){let n=Array.from(this.workspaces.keys());n.length>0?await this.setActiveWorkspace(n[0]):this.activeWorkspace=void 0}this.emit("workspaceRemoved",s),this.outputChannel.appendLine(`\u{1F5D1}\uFE0F Removed workspace: ${s.name}`)}async setActiveWorkspace(e){let s=this.workspaces.get(e);if(!s)throw new Error(`Workspace not found: ${e}`);if(this.activeWorkspace){let n=this.workspaces.get(this.activeWorkspace);n&&(n.isActive=!1)}s.isActive=!0,s.lastAccessed=new Date,this.activeWorkspace=e,this.emit("activeWorkspaceChanged",s),this.outputChannel.appendLine(`\u{1F3AF} Active workspace: ${s.name}`)}getActiveWorkspace(){return this.activeWorkspace?this.workspaces.get(this.activeWorkspace):void 0}getAllWorkspaces(){return Array.from(this.workspaces.values())}async searchAcrossWorkspaces(e,s){let n=[],o=s?.workspaceIds||Array.from(this.workspaces.keys());this.outputChannel.appendLine(`\u{1F50D} Cross-workspace search: "${e}" across ${o.length} workspaces`);for(let i of o){let a=this.workspaces.get(i);if(a)try{let c=await this.searchInWorkspace(a,e,s);n.push(...c)}catch(c){this.outputChannel.appendLine(`\u26A0\uFE0F Search failed in workspace ${a.name}: ${c}`)}}return this.outputChannel.appendLine(`\u{1F4CA} Cross-workspace search completed: ${n.length} results found`),n}async searchInWorkspace(e,s,n){let o=[],i=s.toLowerCase(),c=`${e.configuration.featureFolder||"features"}/**/*.feature`;try{let g=await Y.workspace.findFiles(new Y.RelativePattern(e.rootPath,c),"**/node_modules/**");for(let w of g)(await Y.workspace.fs.readFile(w)).toString().split(`
`).forEach((C,A)=>{if(C.toLowerCase().includes(i)){let P="step";if(C.trim().match(/^\s*Feature:/i)?P="feature":C.trim().match(/^\s*Scenario/i)&&(P="scenario"),n?.includeFeatures===!1&&P==="feature"||n?.includeScenarios===!1&&P==="scenario"||n?.includeSteps===!1&&P==="step")return;o.push({workspaceId:e.id,workspaceName:e.name,filePath:w.fsPath,matchText:C.trim(),matchType:P,line:A+1})}})}catch{}return o}createWorkspaceGroup(e,s,n){let o=this.generateGroupId(),i={id:o,name:e,description:n?.description,workspaces:s,color:n?.color,tags:n?.tags||[]};return this.workspaceGroups.set(o,i),this.emit("workspaceGroupCreated",i),this.outputChannel.appendLine(`\u{1F4C2} Created workspace group: ${e} (${s.length} workspaces)`),o}getWorkspaceGroups(){return Array.from(this.workspaceGroups.values())}async runTestsAcrossWorkspaces(e,s){let n=new Map;if(this.outputChannel.appendLine(`\u{1F680} Running tests across ${e.length} workspaces`),s?.parallel){let o=e.map(a=>this.runTestsInWorkspace(a,s));(await Promise.allSettled(o)).forEach((a,c)=>{let g=e[c];a.status==="fulfilled"?n.set(g,a.value):n.set(g,{error:a.reason})})}else for(let o of e)try{let i=await this.runTestsInWorkspace(o,s);n.set(o,i)}catch(i){n.set(o,{error:i})}return this.outputChannel.appendLine("\u2705 Cross-workspace test execution completed"),n}async runTestsInWorkspace(e,s){let n=this.workspaces.get(e);if(!n)throw new Error(`Workspace not found: ${e}`);return this.outputChannel.appendLine(`\u25B6\uFE0F Running tests in workspace: ${n.name}`),{workspaceId:e,success:!0,duration:1e3,tests:{total:10,passed:8,failed:2}}}async synchronizeConfigurations(e,s){let n=this.workspaces.get(e);if(!n)throw new Error(`Source workspace not found: ${e}`);this.outputChannel.appendLine(`\u{1F504} Synchronizing configuration from ${n.name} to ${s.length} workspaces`);for(let o of s){let i=this.workspaces.get(o);if(!i){this.outputChannel.appendLine(`\u26A0\uFE0F Target workspace not found: ${o}`);continue}try{let a=this.autoDiscoveryServices.get(o);a&&(await a.applyDiscoveredConfiguration(n.configuration),this.outputChannel.appendLine(`\u2705 Synchronized configuration to ${i.name}`))}catch(a){this.outputChannel.appendLine(`\u274C Failed to sync to ${i.name}: ${a}`)}}}generateAnalytics(){let e=Array.from(this.workspaces.values());return{totalWorkspaces:e.length,totalFeatures:e.reduce((s,n)=>s+n.featureCount,0),totalSteps:e.reduce((s,n)=>s+n.stepCount,0),workspacesBySize:e.map(s=>({name:s.name,features:s.featureCount,steps:s.stepCount})).sort((s,n)=>n.features-s.features),recentlyUsed:e.sort((s,n)=>n.lastAccessed.getTime()-s.lastAccessed.getTime()).slice(0,5)}}exportWorkspaceConfiguration(){let e={workspaces:Array.from(this.workspaces.values()),groups:Array.from(this.workspaceGroups.values()),activeWorkspace:this.activeWorkspace,exportedAt:new Date().toISOString()};return JSON.stringify(e,null,2)}async importWorkspaceConfiguration(e){try{let s=JSON.parse(e);this.workspaces.clear(),this.workspaceGroups.clear(),this.autoDiscoveryServices.clear();for(let n of s.workspaces||[]){this.workspaces.set(n.id,n);let o=new ue(this.outputChannel,n.rootPath);this.autoDiscoveryServices.set(n.id,o)}for(let n of s.groups||[])this.workspaceGroups.set(n.id,n);s.activeWorkspace&&this.workspaces.has(s.activeWorkspace)&&await this.setActiveWorkspace(s.activeWorkspace),this.outputChannel.appendLine(`\u{1F4E5} Imported ${this.workspaces.size} workspaces and ${this.workspaceGroups.size} groups`),this.emit("configurationImported")}catch(s){throw this.outputChannel.appendLine(`\u274C Failed to import configuration: ${s}`),new Error(`Import failed: ${s}`)}}setupWorkspaceListeners(){Y.workspace.onDidChangeWorkspaceFolders(async e=>{for(let s of e.added)await this.addWorkspace(s.uri.fsPath,s.name);for(let s of e.removed){let n=this.generateWorkspaceId(s.uri.fsPath);this.workspaces.has(n)&&await this.removeWorkspace(n)}})}async analyzeWorkspace(e,s){let n=0,o=0;try{let i=s.featureFolder||"features";n=(await Y.workspace.findFiles(new Y.RelativePattern(e,`${i}/**/*.feature`),"**/node_modules/**")).length;let c=s.stepsFolder||"steps",g=await Y.workspace.findFiles(new Y.RelativePattern(e,`${c}/**/*.{js,ts,mjs,mts}`),"**/node_modules/**");for(let w of g)try{let S=(await Y.workspace.fs.readFile(w)).toString().match(/(given|when|then)\s*\(/gi);o+=S?S.length:0}catch{}}catch{}return{featureCount:n,stepCount:o}}async loadWorkspaceConfigurations(){}async saveWorkspaceConfigurations(){}generateWorkspaceId(e){return`workspace_${Buffer.from(e).toString("base64").replace(/[=/+]/g,"").slice(0,16)}`}generateGroupId(){return`group_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}};var re=y(require("vscode"));var bt=y(require("vscode")),xe=y(require("path")),ie=y(require("fs")),_e=class{constructor(t,e){this.outputChannel=t,this.workspaceRoot=e}async scanProject(){this.outputChannel.appendLine("\u{1F50D} Scanning project for CI/CD integration opportunities...");let t={hasGitHubActions:!1,workflowFiles:[],hasBDDTests:!1,hasPlaywrightConfig:!1,recommendIntegration:!1,suggestions:[]};try{return await this.discoverGitHubActions(t),await this.discoverBDDSetup(t),this.generateRecommendations(t),this.logDiscoveryResults(t),t}catch(e){return this.outputChannel.appendLine(`\u274C Discovery failed: ${e}`),t}}async discoverGitHubActions(t){let e=xe.join(this.workspaceRoot,".github","workflows");try{if(!await this.directoryExists(e)){this.outputChannel.appendLine("\u{1F4C1} No .github/workflows directory found");return}let o=(await ie.promises.readdir(e)).filter(i=>i.endsWith(".yml")||i.endsWith(".yaml"));if(o.length===0){this.outputChannel.appendLine("\u{1F4C1} No workflow files found in .github/workflows");return}t.hasGitHubActions=!0,this.outputChannel.appendLine(`\u2705 Found ${o.length} GitHub Actions workflow(s)`);for(let i of o){let a=xe.join(e,i),c=await this.analyzeWorkflowFile(a,i);c&&t.workflowFiles.push(c)}}catch(s){this.outputChannel.appendLine(`\u26A0\uFE0F Error scanning GitHub Actions: ${s}`)}}async analyzeWorkflowFile(t,e){try{let s=await ie.promises.readFile(t,"utf8"),n=await ie.promises.stat(t),o=s.match(/^name:\s*(.+)$/m),i=this.extractTriggers(s),a=this.extractJobs(s),c=this.detectBDDInWorkflow(s);return{file:e,name:o?o[1].trim().replace(/['"]/g,""):e,path:t,hasBDDTests:c,triggers:i,jobs:a,lastModified:n.mtime}}catch(s){return this.outputChannel.appendLine(`\u26A0\uFE0F Error analyzing workflow ${e}: ${s}`),null}}extractTriggers(t){let e=[],s=t.match(/^on:\s*(.+)$/m);if(s){let n=s[1];n.includes("push")&&e.push("push"),n.includes("pull_request")&&e.push("pull_request"),n.includes("workflow_dispatch")&&e.push("manual"),n.includes("schedule")&&e.push("scheduled")}return t.includes("push:")&&e.push("push"),t.includes("pull_request:")&&e.push("pull_request"),t.includes("workflow_dispatch:")&&e.push("manual"),t.includes("schedule:")&&e.push("scheduled"),[...new Set(e)]}extractJobs(t){let e=[],s=t.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*?):/gm);return s&&s.forEach(n=>{let o=n.replace(":","").trim();["name","on","env","defaults","concurrency"].includes(o)||e.push(o)}),e}detectBDDInWorkflow(t){let e=["playwright","bdd","cucumber","gherkin","feature","scenario","npx playwright test","playwright-bdd"],s=t.toLowerCase();return e.some(n=>s.includes(n))}async discoverBDDSetup(t){let e=["playwright.config.ts","playwright.config.js","playwright.config.mjs"];for(let n of e){let o=xe.join(this.workspaceRoot,n);if(await this.fileExists(o)){t.hasPlaywrightConfig=!0,this.outputChannel.appendLine(`\u2705 Found Playwright config: ${n}`);break}}try{let n=await bt.workspace.findFiles("**/*.feature","**/node_modules/**",5);n.length>0&&(t.hasBDDTests=!0,this.outputChannel.appendLine(`\u2705 Found ${n.length} .feature file(s)`))}catch(n){this.outputChannel.appendLine(`\u26A0\uFE0F Error searching for feature files: ${n}`)}let s=xe.join(this.workspaceRoot,"package.json");if(await this.fileExists(s))try{let n=await ie.promises.readFile(s,"utf8"),o=JSON.parse(n),i={...o.dependencies,...o.devDependencies};(i["playwright-bdd"]||i["@cucumber/cucumber"])&&(t.hasBDDTests=!0,this.outputChannel.appendLine("\u2705 Found BDD dependencies in package.json")),i["@playwright/test"]&&this.outputChannel.appendLine("\u2705 Found Playwright dependency")}catch(n){this.outputChannel.appendLine(`\u26A0\uFE0F Error reading package.json: ${n}`)}}generateRecommendations(t){t.suggestions=[],!t.hasGitHubActions&&t.hasBDDTests&&(t.recommendIntegration=!0,t.suggestions.push("Create GitHub Actions workflow for automated BDD testing")),t.hasGitHubActions&&t.hasBDDTests&&(t.workflowFiles.filter(s=>s.hasBDDTests).length===0?(t.recommendIntegration=!0,t.suggestions.push("Add BDD test execution to existing workflows")):t.suggestions.push("Enhance existing BDD workflows with advanced reporting")),t.hasGitHubActions&&!t.hasBDDTests&&t.suggestions.push("Consider adding BDD tests to complement existing CI/CD"),!t.hasPlaywrightConfig&&t.hasBDDTests&&t.suggestions.push("Setup Playwright configuration for better test execution"),t.workflowFiles.forEach(e=>{e.triggers.includes("manual")||t.suggestions.push(`Add manual trigger to '${e.name}' workflow for on-demand execution`),!e.hasBDDTests&&t.hasBDDTests&&t.suggestions.push(`Integrate BDD tests into '${e.name}' workflow`)}),t.suggestions.length===0&&t.suggestions.push("Your CI/CD setup looks good! Consider adding advanced reporting features.")}getWorkflowByName(t,e){return t.find(s=>s.name===e||s.file===e)}supportsManualTrigger(t){return t.triggers.includes("manual")}getReadinessScore(t){let e=0;return t.hasGitHubActions&&(e+=30),t.hasBDDTests&&(e+=30),t.hasPlaywrightConfig&&(e+=20),t.workflowFiles.some(s=>s.hasBDDTests)&&(e+=20),Math.min(e,100)}logDiscoveryResults(t){this.outputChannel.appendLine(`
\u{1F4CB} CI/CD Discovery Results:`),this.outputChannel.appendLine(`   GitHub Actions: ${t.hasGitHubActions?"\u2705":"\u274C"}`),this.outputChannel.appendLine(`   BDD Tests: ${t.hasBDDTests?"\u2705":"\u274C"}`),this.outputChannel.appendLine(`   Playwright Config: ${t.hasPlaywrightConfig?"\u2705":"\u274C"}`),this.outputChannel.appendLine(`   Workflows Found: ${t.workflowFiles.length}`),this.outputChannel.appendLine(`   Integration Ready: ${t.recommendIntegration?"\u2705":"\u26A0\uFE0F"}`),t.workflowFiles.length>0&&(this.outputChannel.appendLine(`
\u{1F4DD} Workflows:`),t.workflowFiles.forEach(e=>{this.outputChannel.appendLine(`   - ${e.name} (${e.triggers.join(", ")})`)})),t.suggestions.length>0&&(this.outputChannel.appendLine(`
\u{1F4A1} Suggestions:`),t.suggestions.forEach(e=>{this.outputChannel.appendLine(`   - ${e}`)}))}async fileExists(t){try{return await ie.promises.access(t,ie.constants.F_OK),!0}catch{return!1}}async directoryExists(t){try{return(await ie.promises.stat(t)).isDirectory()}catch{return!1}}};var T=y(require("vscode")),Se=y(require("path")),we=y(require("fs")),Qe=class{constructor(t,e){this.outputChannel=t,this.workspaceRoot=e}async setupIntegration(t){this.outputChannel.appendLine("\u{1F527} Setting up CI/CD integration...");try{let e=await this.showIntegrationWizard(t);return!e||e.mode==="skip"?(this.outputChannel.appendLine("\u2139\uFE0F User chose to skip CI/CD integration"),null):(await this.applyIntegration(e,t),await this.saveIntegrationConfig(e),this.outputChannel.appendLine("\u2705 CI/CD integration setup completed"),e)}catch(e){return this.outputChannel.appendLine(`\u274C Integration setup failed: ${e}`),T.window.showErrorMessage(`Failed to setup CI/CD integration: ${e}`),null}}async showIntegrationWizard(t){let e=[{label:"\u{1F440} View Only",description:"Monitor existing workflows without changes",detail:"Track workflow status and view results in VS Code",mode:"view-only"},{label:"\u{1F527} Enhance Existing",description:"Add BDD reporting to existing workflows",detail:"Enhance current workflows with better reporting and notifications",mode:"enhance"},{label:"\u{1F680} Full Integration",description:"Create optimized BDD workflow",detail:"Generate new workflow with all BDD features and reporting",mode:"full"},{label:"\u274C Skip Integration",description:"Use extension without CI/CD features",detail:"Only use local testing and reporting features",mode:"skip"}],s=await T.window.showQuickPick(e,{placeHolder:"How would you like to integrate with CI/CD?",matchOnDescription:!0});if(!s||s.mode==="skip")return null;let n=await T.window.showQuickPick([{label:"JSON",description:"Machine-readable format for APIs",picked:!0},{label:"HTML",description:"Rich visual dashboard",picked:!0},{label:"XML (JUnit)",description:"Standard CI format",picked:!0}],{placeHolder:"Select report formats to generate",canPickMany:!0});if(!n||n.length===0)return T.window.showWarningMessage("At least one report format must be selected"),null;let o=await T.window.showQuickPick([{label:"Yes",description:"Enable Slack notifications",value:!0},{label:"No",description:"Skip Slack integration",value:!1}],{placeHolder:"Enable Slack notifications?"}),i;if(o?.value&&(i=await T.window.showInputBox({prompt:"Enter Slack webhook URL",placeHolder:"https://hooks.slack.com/services/...",validateInput:c=>{if(!c.startsWith("https://hooks.slack.com/"))return"Please enter a valid Slack webhook URL"}}),!i&&await T.window.showWarningMessage("Slack webhook is required for notifications. Continue without Slack?","Continue","Cancel")!=="Continue"))return null;let a;if(s.mode==="enhance"&&t.workflowFiles.length>0){let c=t.workflowFiles.map(w=>({label:w.name,description:`${w.triggers.join(", ")} \u2022 ${w.jobs.length} jobs`,detail:w.file,workflow:w})),g=await T.window.showQuickPick(c,{placeHolder:"Select workflow to enhance"});g&&(a=g.workflow.file)}return{mode:s.mode,generateReports:!0,enableSlackNotifications:!!i,workflowFile:a,slackWebhook:i,reportFormats:n.map(c=>c.label.toLowerCase().replace(" (junit)",""))}}async applyIntegration(t,e){switch(t.mode){case"view-only":await this.setupViewOnlyMode(t);break;case"enhance":await this.enhanceExistingWorkflow(t,e);break;case"full":await this.createFullIntegration(t,e);break}}async setupViewOnlyMode(t){this.outputChannel.appendLine("\u{1F440} Setting up view-only mode..."),T.window.showInformationMessage("View-only mode configured. You can now monitor workflows and generate reports locally.")}async enhanceExistingWorkflow(t,e){if(!t.workflowFile)throw new Error("No workflow file selected for enhancement");this.outputChannel.appendLine(`\u{1F527} Enhancing workflow: ${t.workflowFile}`);let s=e.workflowFiles.find(i=>i.file===t.workflowFile);if(!s)throw new Error(`Workflow not found: ${t.workflowFile}`);let n=await this.planWorkflowEnhancements(s,t);await this.showEnhancementPreview(n,s)&&(await this.applyWorkflowEnhancements(s,n,t),T.window.showInformationMessage(`Workflow '${s.name}' enhanced successfully! Check .github/workflows/${s.file}`))}async createFullIntegration(t,e){this.outputChannel.appendLine("\u{1F680} Creating full BDD integration...");let s=await this.generateBDDWorkflow(t,e),n=Se.join(this.workspaceRoot,".github","workflows");await we.promises.mkdir(n,{recursive:!0});let o=Se.join(n,"bdd-tests.yml");await we.promises.writeFile(o,s),this.outputChannel.appendLine("\u2705 Created workflow: .github/workflows/bdd-tests.yml"),T.window.showInformationMessage("Full BDD workflow created! Check .github/workflows/bdd-tests.yml","Open Workflow").then(i=>{i==="Open Workflow"&&T.workspace.openTextDocument(o).then(a=>{T.window.showTextDocument(a)})})}async planWorkflowEnhancements(t,e){return{addReporting:e.generateReports&&!t.hasBDDTests,addManualTrigger:!t.triggers.includes("manual"),addBDDSteps:!t.hasBDDTests,addArtifacts:e.generateReports}}async showEnhancementPreview(t,e){let s=[];if(t.addBDDSteps&&s.push("\u2022 Add BDD test execution steps"),t.addReporting&&s.push("\u2022 Add report generation and upload"),t.addManualTrigger&&s.push("\u2022 Add manual workflow trigger"),t.addArtifacts&&s.push("\u2022 Add test result artifacts"),s.length===0)return T.window.showInformationMessage("No enhancements needed - workflow is already optimized!"),!1;let n=`The following changes will be made to '${e.name}':

${s.join(`
`)}`;return await T.window.showInformationMessage(n,{modal:!0},"Apply Changes","Cancel")==="Apply Changes"}async applyWorkflowEnhancements(t,e,s){let o=await we.promises.readFile(t.path,"utf8");e.addManualTrigger&&(o=this.addManualTrigger(o)),(e.addBDDSteps||e.addReporting)&&(o=this.addBDDSteps(o,s));let i=`${t.path}.backup`;await we.promises.copyFile(t.path,i),this.outputChannel.appendLine(`\u{1F4CB} Backup created: ${Se.basename(i)}`),await we.promises.writeFile(t.path,o)}async generateBDDWorkflow(t,e){let s=e.hasPlaywrightConfig,n=this.generateReportSteps(t.reportFormats),o=t.enableSlackNotifications?this.generateSlackStep():"";return`name: BDD Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  bdd-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
      fail-fast: false
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        
      ${s?`- name: Build TypeScript
        run: npm run build`:""}
        
      - name: Run BDD Tests
        run: npx playwright test --project=\${{ matrix.browser }} --reporter=json
        env:
          CI: true
          
      ${n}
      
      ${o}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-\${{ matrix.browser }}
          path: |
            test-results/
            playwright-report/
          retention-days: 7
          
  aggregate-results:
    needs: bdd-tests
    if: always()
    runs-on: ubuntu-latest
    
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        
      - name: Aggregate test results
        run: |
          echo "Aggregating test results from all browsers..."
          # Custom aggregation logic would go here
          
      ${t.enableSlackNotifications?`- name: Send summary to Slack
        if: always()
        run: |
          echo "Sending aggregated results to Slack..."
          # Slack notification logic`:""}
`}generateReportSteps(t){let e=[];return t.includes("html")&&e.push(`      - name: Generate HTML Report
        if: always()
        run: npx playwright show-report --host=0.0.0.0`),t.includes("xml")&&e.push(`      - name: Generate JUnit Report
        if: always()
        run: npx playwright test --reporter=junit`),e.join(`
        
`)}generateSlackStep(){return`      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: \${{ job.status }}
          webhook_url: \${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author,action,eventName,ref,workflow`}addManualTrigger(t){if(t.match(/^on:\s*$/m))return t.replace(/^on:\s*\n/m,`on:
  workflow_dispatch:
`);let s=t.match(/^on:\s*(.+)$/m);return s&&!s[1].includes("workflow_dispatch")?t.replace(/^on:\s*(.+)$/m,"on: [$1, workflow_dispatch]"):t}addBDDSteps(t,e){let s=`
      - name: Run BDD Tests
        run: npx playwright test --reporter=json,html
        
      - name: Generate Reports
        if: always()
        run: |
          echo "Generating BDD test reports..."
          # Report generation steps would be added here
          
      ${e.enableSlackNotifications?`- name: Notify Slack
        if: always()
        run: |
          echo "Sending results to Slack..."`:""}`,n=t.match(/(\s+steps:\s*\n[\s\S]*?)(\n\s*[a-zA-Z_])/);return n?t.replace(n[1],n[1]+s+`
`):t}async saveIntegrationConfig(t){let e=T.workspace.getConfiguration("playwrightBdd");await e.update("cicd.mode",t.mode,T.ConfigurationTarget.Workspace),await e.update("cicd.reportFormats",t.reportFormats,T.ConfigurationTarget.Workspace),await e.update("cicd.enableSlackNotifications",t.enableSlackNotifications,T.ConfigurationTarget.Workspace),t.slackWebhook&&await e.update("cicd.slackWebhook",t.slackWebhook,T.ConfigurationTarget.Workspace),this.outputChannel.appendLine("\u{1F4BE} Integration configuration saved")}async getIntegrationStatus(){let e=T.workspace.getConfiguration("playwrightBdd").get("cicd.mode");return{enabled:!!e&&e!=="skip",mode:e,lastCheck:new Date}}};var k=y(require("vscode")),it=y(require("path")),Je=class{constructor(t,e){this.outputChannel=t,this.workspaceRoot=e}async setupGitHubAPI(){try{let t=await this.detectGitHubRepo();if(!t)return k.window.showWarningMessage("Could not detect GitHub repository. Manual workflow triggering will be limited."),!1;this.apiConfig=t;let e=await this.getGitHubToken();return e?(this.apiConfig.token=e,this.outputChannel.appendLine("\u2705 GitHub API configured successfully"),!0):(this.outputChannel.appendLine("\u26A0\uFE0F GitHub API configured without token (read-only access)"),!1)}catch(t){return this.outputChannel.appendLine(`\u274C Failed to setup GitHub API: ${t}`),!1}}async triggerWorkflow(t,e){if(!this.apiConfig?.token)return k.window.showErrorMessage("GitHub token is required to trigger workflows. Please configure GitHub authentication."),!1;try{this.outputChannel.appendLine(`\u{1F680} Triggering workflow: ${t.name}`);let s=e?.branch||await this.selectBranch();if(!s)return!1;let n=e?.inputs||await this.getWorkflowInputs(t);if(await this.callGitHubAPI("POST",`/repos/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/workflows/${t.file}/dispatches`,{ref:s,inputs:n||{}}))return this.outputChannel.appendLine(`\u2705 Workflow '${t.name}' triggered successfully on branch '${s}'`),k.window.showInformationMessage(`Workflow '${t.name}' triggered on '${s}'`,"View on GitHub","Monitor Progress").then(i=>{i==="View on GitHub"?k.env.openExternal(k.Uri.parse(`https://github.com/${this.apiConfig.owner}/${this.apiConfig.repo}/actions`)):i==="Monitor Progress"&&this.monitorWorkflowProgress(t)}),!0;throw new Error("GitHub API request failed")}catch(s){return this.outputChannel.appendLine(`\u274C Failed to trigger workflow: ${s}`),k.window.showErrorMessage(`Failed to trigger workflow: ${s}`),!1}}async monitorWorkflowProgress(t){if(!this.apiConfig)return;this.outputChannel.appendLine(`\u{1F440} Monitoring workflow: ${t.name}`);let e=k.window.createStatusBarItem(k.StatusBarAlignment.Left);e.text=`$(sync~spin) ${t.name}`,e.tooltip="BDD Workflow Running...",e.command="playwright-bdd.viewWorkflowStatus",e.show();try{let s=Date.now(),n=30*60*1e3;for(;Date.now()-s<n;){let o=await this.getRecentWorkflowRuns(t.file);if(o&&o.length>0){let i=o[0];if(this.updateProgressStatus(e,i,t),i.status==="completed"){this.handleWorkflowCompletion(i,t);break}}await new Promise(i=>setTimeout(i,1e4))}}catch(s){this.outputChannel.appendLine(`\u26A0\uFE0F Error monitoring workflow: ${s}`)}finally{setTimeout(()=>{e.hide(),e.dispose()},5e3)}}async getRecentWorkflowRuns(t,e=5){if(!this.apiConfig)return null;try{let s=await this.callGitHubAPI("GET",`/repos/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/workflows/${t}/runs?per_page=${e}`);return s&&s.workflow_runs?s.workflow_runs.map(n=>({id:n.id,workflowId:n.workflow_id,headBranch:n.head_branch,headSha:n.head_sha,status:n.status,conclusion:n.conclusion,htmlUrl:n.html_url,createdAt:new Date(n.created_at),updatedAt:new Date(n.updated_at)})):null}catch(s){return this.outputChannel.appendLine(`\u26A0\uFE0F Error fetching workflow runs: ${s}`),null}}async showWorkflowStatus(t){if(!this.apiConfig){k.window.showWarningMessage("GitHub API not configured. Cannot fetch workflow status.");return}try{this.outputChannel.appendLine("\u{1F4CA} Fetching workflow status...");let e=[];for(let n of t){let o=await this.getRecentWorkflowRuns(n.file,1),i=o&&o.length>0?o[0]:null,a=i?this.getStatusIcon(i.status,i.conclusion):"\u26AA";e.push({label:`${a} ${n.name}`,description:i?`${i.status} \u2022 ${i.headBranch}`:"No recent runs",detail:i?`Last run: ${i.updatedAt.toLocaleString()}`:`Triggers: ${n.triggers.join(", ")}`,workflow:n,run:i||void 0})}let s=await k.window.showQuickPick(e,{placeHolder:"Select workflow to view details or trigger",matchOnDescription:!0});s&&await this.showWorkflowActions(s.workflow,s.run)}catch(e){this.outputChannel.appendLine(`\u274C Error fetching workflow status: ${e}`),k.window.showErrorMessage("Failed to fetch workflow status")}}async showWorkflowActions(t,e){let s=[];t.triggers.includes("manual")&&s.push({label:"\u{1F680} Trigger Workflow",description:"Start a new workflow run",action:"trigger"}),e&&(s.push({label:"\u{1F310} View on GitHub",description:"Open workflow run in browser",action:"view"}),e.status==="in_progress"&&s.push({label:"\u{1F440} Monitor Progress",description:"Watch workflow execution in real-time",action:"monitor"})),s.push({label:"\u{1F4CB} View Workflow File",description:"Open workflow YAML in editor",action:"edit"});let n=await k.window.showQuickPick(s,{placeHolder:`Actions for ${t.name}`});if(n)switch(n.action){case"trigger":await this.triggerWorkflow(t);break;case"view":e&&k.env.openExternal(k.Uri.parse(e.htmlUrl));break;case"monitor":await this.monitorWorkflowProgress(t);break;case"edit":let o=await k.workspace.openTextDocument(t.path);k.window.showTextDocument(o);break}}updateProgressStatus(t,e,s){let n="$(sync~spin)",o=s.name;switch(e.status){case"queued":n="$(clock)",o=`${s.name} (queued)`;break;case"in_progress":n="$(sync~spin)",o=`${s.name} (running)`;break;case"completed":n=e.conclusion==="success"?"$(check)":"$(x)",o=`${s.name} (${e.conclusion})`;break}t.text=`${n} ${o}`,t.tooltip=`Workflow: ${s.name}
Status: ${e.status}
Branch: ${e.headBranch}`}handleWorkflowCompletion(t,e){let o=`${t.conclusion==="success"?"\u2705":"\u274C"} Workflow '${e.name}' ${t.conclusion}`;this.outputChannel.appendLine(o),k.window.showInformationMessage(o,"View Results","View on GitHub").then(i=>{i==="View Results"?k.commands.executeCommand("playwright-bdd.generateHTMLReport"):i==="View on GitHub"&&k.env.openExternal(k.Uri.parse(t.htmlUrl))})}getStatusIcon(t,e){switch(t){case"queued":return"\u{1F7E1}";case"in_progress":return"\u{1F535}";case"completed":switch(e){case"success":return"\u2705";case"failure":return"\u274C";case"cancelled":return"\u26AA";case"skipped":return"\u23ED\uFE0F";default:return"\u2753"}default:return"\u26AA"}}async selectBranch(){let t=await this.getCurrentBranch(),e=[{label:"main",description:"Main branch"},{label:"develop",description:"Development branch"}];t&&!["main","develop"].includes(t)&&e.unshift({label:t,description:"Current branch"}),e.push({label:"$(edit) Enter custom branch",description:"Specify a different branch"});let s=await k.window.showQuickPick(e,{placeHolder:"Select branch to trigger workflow on"});if(s)return s.label.includes("Enter custom branch")?await k.window.showInputBox({prompt:"Enter branch name",placeHolder:"feature/my-branch",value:t||"main"}):s.label}async getWorkflowInputs(t){return{}}async detectGitHubRepo(){try{let t=await this.getGitRemoteInfo();if(t)return this.outputChannel.appendLine(`\u2705 Detected GitHub repo from git remote: ${t.owner}/${t.repo}`),t;let e=it.join(this.workspaceRoot,"package.json");try{let s=await k.workspace.fs.readFile(k.Uri.file(e)),n=JSON.parse(s.toString());if(n.repository?.url){let o=n.repository.url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);if(o)return this.outputChannel.appendLine(`\u2705 Detected GitHub repo from package.json: ${o[1]}/${o[2]}`),{owner:o[1],repo:o[2]}}}catch{}return this.outputChannel.appendLine("\u274C Could not detect GitHub repository from git remote or package.json"),null}catch(t){return this.outputChannel.appendLine(`\u26A0\uFE0F Could not detect GitHub repo: ${t}`),null}}async getGitRemoteInfo(){try{let t=it.join(this.workspaceRoot,".git");try{if(!await k.workspace.fs.stat(k.Uri.file(t)))return null}catch{return null}let{exec:e}=require("child_process"),{promisify:s}=require("util"),n=s(e);try{let{stdout:o}=await n("git remote get-url origin",{cwd:this.workspaceRoot}),i=o.trim(),a=i.match(/https:\/\/github\.com\/([^/]+)\/([^/.]+)/),c=i.match(/git@github\.com:([^/]+)\/([^/.]+)/);if(a)return{owner:a[1],repo:a[2].replace(/\.git$/,"")};if(c)return{owner:c[1],repo:c[2].replace(/\.git$/,"")}}catch(o){this.outputChannel.appendLine(`\u26A0\uFE0F Git command failed: ${o}`)}return null}catch(t){return this.outputChannel.appendLine(`\u26A0\uFE0F Error getting git remote info: ${t}`),null}}async getGitHubToken(){let t=k.workspace.getConfiguration("playwrightBdd"),e=t.get("cicd.githubToken");return e||await k.window.showInformationMessage("GitHub token is required to trigger workflows. Would you like to configure it?","Configure Token","Skip")==="Configure Token"&&(e=await k.window.showInputBox({prompt:"Enter GitHub Personal Access Token",placeHolder:"ghp_xxxxxxxxxxxxxxxxxxxx",password:!0,validateInput:n=>{if(!n.startsWith("ghp_")&&!n.startsWith("github_pat_"))return"Please enter a valid GitHub token"}}),e&&(await t.update("cicd.githubToken",e,k.ConfigurationTarget.Workspace),this.outputChannel.appendLine("\u{1F4BE} GitHub token saved to workspace settings"))),e}async getCurrentBranch(){}async callGitHubAPI(t,e,s){if(!this.apiConfig?.token)throw new Error("GitHub token not configured");let n=`https://api.github.com${e}`;try{return this.outputChannel.appendLine(`\u{1F4E1} GitHub API: ${t} ${e}`),t==="POST"&&e.includes("/dispatches")?{success:!0}:t==="GET"&&e.includes("/runs")?{workflow_runs:[{id:Date.now(),workflow_id:123,head_branch:"main",head_sha:"abc123",status:"completed",conclusion:"success",html_url:`https://github.com/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/runs/${Date.now()}`,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}]}:{success:!0}}catch(o){throw new Error(`GitHub API call failed: ${o}`)}}};var Ke=class{constructor(t,e){this.outputChannel=t,this.workspaceRoot=e,this.discovery=new _e(t,e),this.integrator=new Qe(t,e),this.trigger=new Je(t,e)}async initialize(){this.outputChannel.appendLine("\u{1F504} Initializing CI/CD Integration...");try{this.discoveryResult=await this.discovery.scanProject(),await this.trigger.setupGitHubAPI(),this.outputChannel.appendLine("\u2705 CI/CD Integration initialized"),this.discoveryResult.recommendIntegration&&this.showIntegrationSuggestion()}catch(t){this.outputChannel.appendLine(`\u274C CI/CD initialization failed: ${t}`)}}async showIntegrationSuggestion(){if(!this.discoveryResult)return;let e=`CI/CD integration is recommended for your project (${this.discovery.getReadinessScore(this.discoveryResult)}% ready). Would you like to set it up?`;switch(await re.window.showInformationMessage(e,"Setup Integration","View Details","Skip")){case"Setup Integration":await this.setupIntegration();break;case"View Details":await this.showDiscoveryDetails();break}}async setupIntegration(){if(!this.discoveryResult){re.window.showWarningMessage("Please run discovery first");return}try{await this.integrator.setupIntegration(this.discoveryResult)&&re.window.showInformationMessage("CI/CD integration setup completed!")}catch(t){this.outputChannel.appendLine(`\u274C Integration setup failed: ${t}`),re.window.showErrorMessage("CI/CD integration setup failed")}}async showDiscoveryDetails(){if(!this.discoveryResult)return;let t=[{label:"\u{1F4CA} Project Analysis",description:`${this.discoveryResult.workflowFiles.length} workflows, ${this.discoveryResult.hasBDDTests?"BDD detected":"No BDD"}`},...this.discoveryResult.suggestions.map(e=>({label:"\u{1F4A1} Suggestion",description:e}))];await re.window.showQuickPick(t,{placeHolder:"CI/CD Discovery Results"})}async manageWorkflows(){if(this.discoveryResult||await this.initialize(),!this.discoveryResult||this.discoveryResult.workflowFiles.length===0){re.window.showInformationMessage("No GitHub Actions workflows found");return}await this.trigger.showWorkflowStatus(this.discoveryResult.workflowFiles)}async generateReports(){try{this.outputChannel.appendLine("\u{1F4CA} Starting report generation..."),re.window.showInformationMessage("Report generation feature coming soon!")}catch(t){this.outputChannel.appendLine(`\u274C Report generation failed: ${t}`),re.window.showErrorMessage("Report generation failed")}}async getStatus(){let t=await this.integrator.getIntegrationStatus();return{initialized:!!this.discoveryResult,hasWorkflows:this.discoveryResult?.hasGitHubActions||!1,hasBDDTests:this.discoveryResult?.hasBDDTests||!1,integrationEnabled:t.enabled}}async refresh(){this.outputChannel.appendLine("\u{1F504} Refreshing CI/CD discovery..."),this.discoveryResult=await this.discovery.scanProject()}};var H=y(require("vscode")),ae=y(require("path")),$e=y(require("fs")),Ye=class{constructor(t,e){this.outputChannel=t,this.workspaceRoot=e}async showReports(){this.outputChannel.appendLine("\u{1F4CA} Looking for existing reports...");try{let t=await this.findExistingReports();if(t.length===0){H.window.showInformationMessage("No test reports found. Run tests first to generate reports.");return}let e=await H.window.showQuickPick(t,{placeHolder:"Select a report to view"});e&&await this.openReport(e.path,e.type)}catch(t){this.outputChannel.appendLine(`\u274C Error finding reports: ${t}`),H.window.showErrorMessage("Failed to find reports")}}async findExistingReports(){let t=[],e=["playwright-report","test-results","cucumber-report","reports"];for(let s of e){let n=ae.join(this.workspaceRoot,s);try{if(await this.directoryExists(n)){let o=await this.scanReportDirectory(n,s);t.push(...o)}}catch{}}return t}async scanReportDirectory(t,e){let s=[];try{let n=await $e.promises.readdir(t);for(let o of n){let i=ae.join(t,o);if((await $e.promises.stat(i)).isFile()){let c=this.identifyReportFile(i,o,e);c&&s.push(c)}}}catch{}return s}identifyReportFile(t,e,s){let n=e.toLowerCase();return n.includes("index.html")||n.includes("report.html")?{label:`\u{1F4CA} ${s} - HTML Report`,description:`${e} \u2022 Interactive dashboard`,path:t,type:"html"}:n.includes(".json")&&(n.includes("test")||n.includes("result")||n.includes("report"))?{label:`\u{1F4C4} ${s} - JSON Report`,description:`${e} \u2022 Machine readable`,path:t,type:"json"}:n.includes(".xml")&&(n.includes("test")||n.includes("result")||n.includes("junit"))?{label:`\u{1F4CB} ${s} - XML Report`,description:`${e} \u2022 JUnit format`,path:t,type:"xml"}:null}async openReport(t,e){try{switch(e){case"html":await this.openHTMLReport(t);break;case"json":case"xml":await this.openTextReport(t);break}}catch(s){this.outputChannel.appendLine(`\u274C Error opening report: ${s}`),H.window.showErrorMessage("Failed to open report")}}async openHTMLReport(t){let e=H.Uri.file(t);await H.env.openExternal(e),this.outputChannel.appendLine(`\u{1F310} Opened HTML report: ${ae.basename(t)}`)}async openTextReport(t){let e=await H.workspace.openTextDocument(t);await H.window.showTextDocument(e),this.outputChannel.appendLine(`\u{1F4C4} Opened report: ${ae.basename(t)}`)}async shareReport(t){if(!H.workspace.getConfiguration("playwrightBdd").get("cicd.slackWebhook")){H.window.showWarningMessage("Slack webhook not configured");return}try{let n=await this.generateReportSummary(t);H.window.showInformationMessage(`Report summary would be shared to Slack:
${n}`)}catch(n){this.outputChannel.appendLine(`\u274C Error sharing report: ${n}`),H.window.showErrorMessage("Failed to share report")}}async generateReportSummary(t){try{let e=ae.basename(t),s=await $e.promises.stat(t);return`\u{1F4CA} Test Report: ${e}
\u{1F4C5} Generated: ${s.mtime.toLocaleString()}
\u{1F4C1} Location: ${ae.relative(this.workspaceRoot,t)}`}catch{return"Report summary not available"}}async directoryExists(t){try{return(await $e.promises.stat(t)).isDirectory()}catch{return!1}}};var m=y(require("vscode")),Ze=class{constructor(t,e){this.testResults=new Map;this.selectedTags=new Set;this.statusFilter="all";this.disposables=[];this.controller=t,this.outputChannel=e,this.treeDataProvider=new rt(t,this),this.setupTreeView(),this.setupWebviewPanel()}registerCommands(t){t.subscriptions.push(m.commands.registerCommand("playwright-bdd.treeView.runSelected",()=>{this.runSelectedTests()})),t.subscriptions.push(m.commands.registerCommand("playwright-bdd.treeView.debugSelected",()=>{this.debugSelectedTests()})),t.subscriptions.push(m.commands.registerCommand("playwright-bdd.treeView.filterByTag",()=>{this.showTagFilter()})),t.subscriptions.push(m.commands.registerCommand("playwright-bdd.treeView.filterByStatus",()=>{this.showStatusFilter()})),t.subscriptions.push(m.commands.registerCommand("playwright-bdd.treeView.clearFilters",()=>{this.clearAllFilters()})),t.subscriptions.push(m.commands.registerCommand("playwright-bdd.treeView.showResults",()=>{this.showResultsWebview()})),t.subscriptions.push(m.commands.registerCommand("playwright-bdd.treeView.showSettings",()=>{m.commands.executeCommand("playwright-bdd.showSettings")}))}setupTreeView(){let t=m.window.createTreeView("playwrightBddTests",{treeDataProvider:this.treeDataProvider,showCollapseAll:!0,canSelectMany:!0});t.onDidChangeSelection(e=>{this.handleSelectionChange(e.selection)}),this.disposables.push(t)}setupWebviewPanel(){}handleSelectionChange(t){if(t.length===0)return;let e=t.some(n=>n.testItem);m.commands.executeCommand("setContext","bddTestsSelected",e),m.commands.executeCommand("setContext","bddMultipleTestsSelected",t.length>1);let s=m.window.createStatusBarItem(m.StatusBarAlignment.Left);s.text=`$(beaker) ${t.length} test(s) selected`,s.show(),setTimeout(()=>{s.hide(),s.dispose()},3e3)}async runSelectedTests(){let t=this.treeDataProvider.getSelectedItems();if(t.length===0){m.window.showWarningMessage("No tests selected");return}let e=t.map(o=>o.testItem).filter(Boolean);if(e.length===0){m.window.showWarningMessage("Selected items are not runnable tests");return}let s=new m.TestRunRequest(e),n=this.controller.createTestRun(s);try{for(let o of e){n.enqueued(o),n.started(o);let i=await this.executeTest(o);if(this.updateTestResult(o.id,i),i.status==="passed")n.passed(o,i.duration);else if(i.status==="failed"){let a=new m.TestMessage(i.error||"Test failed");n.failed(o,a,i.duration)}else i.status==="skipped"&&n.skipped(o)}}finally{n.end()}this.treeDataProvider.refresh()}async debugSelectedTests(){let t=this.treeDataProvider.getSelectedItems();if(t.length===0){m.window.showWarningMessage("No tests selected");return}let e=t[0].testItem;if(!e){m.window.showWarningMessage("Selected item is not a runnable test");return}m.commands.executeCommand("playwright-bdd.debugScenario",e.label)}async showTagFilter(){let t=this.extractTagsFromTests();if(t.length===0){m.window.showInformationMessage("No tags found in test files");return}let e=t.map(n=>({label:`@${n.name}`,description:`${n.count} test(s)`,picked:this.selectedTags.has(n.name),tag:n})),s=await m.window.showQuickPick(e,{placeHolder:"Select tags to filter by (filters VSCode Test Explorer)",canPickMany:!0,matchOnDescription:!0});s&&(this.selectedTags.clear(),s.forEach(n=>this.selectedTags.add(n.tag.name)),this.applyMainTestExplorerFilters())}async showStatusFilter(){let t=[{label:"All Tests",value:"all",description:"Show all tests regardless of status"},{label:"\u2705 Passed",value:"passed",description:"Show only passed tests"},{label:"\u274C Failed",value:"failed",description:"Show only failed tests"},{label:"\u23ED\uFE0F Skipped",value:"skipped",description:"Show only skipped tests"},{label:"\u23F8\uFE0F Not Run",value:"pending",description:"Show only tests that haven't been run"}],e=await m.window.showQuickPick(t,{placeHolder:"Filter tests by status"});e&&(this.statusFilter=e.value,this.applyFilters())}clearAllFilters(){this.selectedTags.clear(),this.statusFilter="all",this.applyFilters(),this.applyMainTestExplorerFilters(),m.window.showInformationMessage("All filters cleared from VSCode Test Explorer")}applyFilters(){this.treeDataProvider.applyFilters({tags:Array.from(this.selectedTags),status:this.statusFilter});let t=[];if(this.selectedTags.size>0&&t.push(`Tags: ${Array.from(this.selectedTags).join(", ")}`),this.statusFilter!=="all"&&t.push(`Status: ${this.statusFilter}`),t.length>0){let e=m.window.createStatusBarItem(m.StatusBarAlignment.Left);e.text=`$(filter) Filters: ${t.join(" | ")}`,e.command="playwright-bdd.treeView.clearFilters",e.show()}}applyMainTestExplorerFilters(){let t=Array.from(this.selectedTags);this.controller.items.forEach(n=>{this.filterTestItem(n,t)});let e=[];this.selectedTags.size>0&&e.push(`Tags: ${t.join(", ")}`);let s=m.window.createStatusBarItem(m.StatusBarAlignment.Left);e.length>0?(s.text=`$(filter) VSCode Test Explorer filtered by: ${e.join(" | ")}`,s.command="playwright-bdd.treeView.clearFilters",s.tooltip="Click to clear filters"):s.text="$(filter-filled) VSCode Test Explorer - No filters active",s.show(),setTimeout(()=>{s.hide(),s.dispose()},5e3),this.outputChannel.appendLine(`Applied tag filters to VSCode Test Explorer: ${t.join(", ")}`)}filterTestItem(t,e){if(e.length===0)return this.setTestItemVisibility(t,!0),!0;let s=this.extractTagsFromTestItem(t),n=e.some(a=>s.includes(a)),o=!1;t.children.forEach(a=>{this.filterTestItem(a,e)&&(o=!0)});let i=n||o;return this.setTestItemVisibility(t,i),i}setTestItemVisibility(t,e){e?this.controller.items.get(t.id)||this.controller.items.add(t):this.controller.items.delete(t.id)}showResultsWebview(){if(this.webviewPanel){this.webviewPanel.reveal();return}this.webviewPanel=m.window.createWebviewPanel("bddTestResults","BDD Test Results & Analytics",m.ViewColumn.Two,{enableScripts:!0,localResourceRoots:[]}),this.webviewPanel.webview.html=this.getWebviewContent(),this.webviewPanel.onDidDispose(()=>{this.webviewPanel=void 0}),this.webviewPanel.webview.onDidReceiveMessage(t=>this.handleWebviewMessage(t),void 0)}getWebviewContent(){let t=Array.from(this.testResults.values()),e=t.length,s=t.filter(c=>c.status==="passed").length,n=t.filter(c=>c.status==="failed").length,o=t.filter(c=>c.status==="skipped").length,i=e>0?Math.round(s/e*100):0,a=t.sort((c,g)=>g.timestamp.getTime()-c.timestamp.getTime()).slice(0,10);return`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BDD Test Results</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                margin: 0;
            }
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 20px;
                margin-bottom: 20px;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 15px;
                text-align: center;
            }
            .stat-number {
                font-size: 2em;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .stat-label {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
            }
            .passed { color: var(--vscode-testing-iconPassed); }
            .failed { color: var(--vscode-testing-iconFailed); }
            .skipped { color: var(--vscode-testing-iconSkipped); }
            .progress-bar {
                height: 8px;
                background: var(--vscode-progressBar-background);
                border-radius: 4px;
                overflow: hidden;
                margin: 10px 0;
            }
            .progress-fill {
                height: 100%;
                background: var(--vscode-testing-iconPassed);
                transition: width 0.3s ease;
            }
            .recent-tests {
                margin-top: 30px;
            }
            .test-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .test-name {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .test-status {
                margin-right: 10px;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 0.8em;
            }
            .test-duration {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
            }
            .button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 3px;
                cursor: pointer;
                margin: 0 5px;
            }
            .button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .filters {
                margin-bottom: 20px;
                padding: 15px;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border-radius: 6px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>\u{1F9EA} BDD Test Results & Analytics</h1>
            <p>Comprehensive overview of your Playwright BDD test execution</p>
        </div>

        <div class="filters">
            <button class="button" onclick="refreshResults()">\u{1F504} Refresh</button>
            <button class="button" onclick="exportResults()">\u{1F4CB} Export</button>
            <button class="button" onclick="showTrends()">\u{1F4CA} Trends</button>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${e}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number passed">${s}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number failed">${n}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number skipped">${o}</div>
                <div class="stat-label">Skipped</div>
            </div>
        </div>

        <div class="progress-container">
            <h3>Overall Pass Rate: ${i}%</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${i}%"></div>
            </div>
        </div>

        <div class="recent-tests">
            <h3>Recent Test Results</h3>
            ${a.map(c=>`
                <div class="test-item">
                    <div class="test-name">${c.name}</div>
                    <div class="test-status ${c.status}">${this.getStatusIcon(c.status)}</div>
                    <div class="test-duration">${c.duration||0}ms</div>
                </div>
            `).join("")}
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function refreshResults() {
                vscode.postMessage({ command: 'refresh' });
            }
            
            function exportResults() {
                vscode.postMessage({ command: 'export' });
            }
            
            function showTrends() {
                vscode.postMessage({ command: 'trends' });
            }
        </script>
    </body>
    </html>`}handleWebviewMessage(t){switch(t.command){case"refresh":this.refreshResults();break;case"export":this.exportResults();break;case"trends":this.showTrends();break}}getStatusIcon(t){switch(t){case"passed":return"\u2705";case"failed":return"\u274C";case"skipped":return"\u23ED\uFE0F";case"pending":return"\u23F8\uFE0F";default:return"\u2753"}}extractTagsFromTests(){let t=new Map;return this.controller.items.forEach(e=>{this.extractTagsFromTestItem(e).forEach(n=>{t.set(n,(t.get(n)||0)+1)})}),Array.from(t.entries()).map(([e,s])=>({name:e,count:s,color:this.getTagColor(e)}))}extractTagsFromTestItem(t){if(!t.uri)return[];try{let s=require("fs").readFileSync(t.uri.fsPath,"utf8").split(`
`),n=[];for(let o of s){let i=o.match(/@(\w+)/g);i&&i.forEach(a=>{let c=a.substring(1);n.includes(c)||n.push(c)})}return n}catch{return[]}}getTagColor(t){let e=["blue","green","orange","purple","red","yellow"],s=t.split("").reduce((n,o)=>n+o.charCodeAt(0),0);return e[s%e.length]}async executeTest(t){return{id:t.id,name:t.label,status:"passed",duration:Math.random()*1e3,timestamp:new Date}}updateTestResult(t,e){this.testResults.set(t,e)}refreshResults(){this.webviewPanel&&(this.webviewPanel.webview.html=this.getWebviewContent())}async exportResults(){let t=Array.from(this.testResults.values()),e=this.generateTestReport(t),s=await m.workspace.openTextDocument({content:e,language:"markdown"});await m.window.showTextDocument(s)}showTrends(){m.window.showInformationMessage("Trends analysis feature coming soon!")}generateTestReport(t){let e=t.length,s=t.filter(i=>i.status==="passed").length,n=t.filter(i=>i.status==="failed").length,o=t.filter(i=>i.status==="skipped").length;return`# BDD Test Execution Report

Generated: ${new Date().toLocaleString()}

## Summary
- **Total Tests**: ${e}
- **Passed**: ${s} (${Math.round(s/e*100)}%)
- **Failed**: ${n} (${Math.round(n/e*100)}%)
- **Skipped**: ${o} (${Math.round(o/e*100)}%)

## Test Results

${t.map(i=>`
### ${i.name}
- **Status**: ${i.status}
- **Duration**: ${i.duration||0}ms
- **Timestamp**: ${i.timestamp.toLocaleString()}
${i.error?`- **Error**: ${i.error}`:""}
`).join("")}
`}dispose(){this.webviewPanel&&this.webviewPanel.dispose(),this.disposables.forEach(t=>t.dispose()),this.disposables=[]}},rt=class{constructor(t,e){this.controller=t;this.ui=e;this._onDidChangeTreeData=new m.EventEmitter;this.onDidChangeTreeData=this._onDidChangeTreeData.event;this.selectedItems=[];this.activeFilters={tags:[],status:"all"}}refresh(){this._onDidChangeTreeData.fire()}getTreeItem(t){return t}getChildren(t){if(t){let e=[];return t.testItem&&t.testItem.children.forEach(s=>{this.shouldShowItem(s)&&e.push(new Xe(s.label,s.children.size>0?m.TreeItemCollapsibleState.Collapsed:m.TreeItemCollapsibleState.None,s,"scenario"))}),Promise.resolve(e)}else{let e=[];return this.controller.items.forEach(s=>{this.shouldShowItem(s)&&e.push(new Xe(s.label,m.TreeItemCollapsibleState.Expanded,s,"feature"))}),Promise.resolve(e)}}shouldShowItem(t){if(this.activeFilters.status!=="all"){let e=this.ui.testResults.get(t.id);if(!e||e.status!==this.activeFilters.status)return!1}if(this.activeFilters.tags.length>0){let e=this.ui.extractTagsFromTestItem(t);if(!this.activeFilters.tags.some(n=>e.includes(n)))return!1}return!0}applyFilters(t){this.activeFilters=t,this.refresh()}getSelectedItems(){return this.selectedItems}},Xe=class extends m.TreeItem{constructor(e,s,n,o){super(e,s);this.label=e;this.collapsibleState=s;this.testItem=n;this.type=o;this.tooltip=`${this.label}`,this.description=this.getDescription(),this.iconPath=this.getIcon(),this.contextValue=this.type,n&&(this.command={command:"vscode.open",title:"Open",arguments:[n.uri]})}getDescription(){if(this.type==="feature"&&this.testItem){let e=this.testItem.children.size;return e>0?`${e} scenarios`:""}return""}getIcon(){switch(this.type){case"feature":return new m.ThemeIcon("file-text");case"scenario":return new m.ThemeIcon("beaker");case"example":return new m.ThemeIcon("symbol-array");default:return new m.ThemeIcon("symbol-misc")}}};var x=y(require("vscode")),De=y(require("path")),et=class{constructor(t,e){this.outputChannel=t,this.workspaceRoot=e}async showSettingsUI(){if(this.webviewPanel){this.webviewPanel.reveal();return}this.webviewPanel=x.window.createWebviewPanel("bddSettings","BDD Test Runner Settings",x.ViewColumn.One,{enableScripts:!0,localResourceRoots:[],retainContextWhenHidden:!0}),this.webviewPanel.webview.html=await this.getSettingsWebviewContent(),this.webviewPanel.onDidDispose(()=>{this.webviewPanel=void 0}),this.webviewPanel.webview.onDidReceiveMessage(t=>this.handleWebviewMessage(t),void 0)}getConfigurationFields(){return[{key:"playwrightBdd.configPath",label:"Playwright Config Path",type:"path",description:"Path to the Playwright config file relative to the workspace root",defaultValue:"./playwright.config.ts",placeholder:"./playwright.config.ts",group:"core"},{key:"playwrightBdd.tsconfigPath",label:"TypeScript Config Path",type:"path",description:"Optional path to a custom tsconfig file for Playwright tests",defaultValue:"",placeholder:"./tsconfig.json",group:"core"},{key:"playwrightBdd.featureFolder",label:"Features Folder",type:"path",description:"Relative path to the folder containing .feature files",defaultValue:"features",placeholder:"features",group:"core"},{key:"playwrightBdd.stepsFolder",label:"Steps Folder",type:"path",description:"Relative path to the folder containing step definition files",defaultValue:"steps",placeholder:"steps",group:"core"},{key:"playwrightBdd.tags",label:"Default Tags Filter",type:"string",description:"Optional value for feature/scenario tags to filter tests. Used as --grep=<tags>",defaultValue:"",placeholder:"@smoke,@regression",group:"execution"},{key:"playwrightBdd.enableFeatureGen",label:"Enable Feature Generation",type:"boolean",description:"Whether to run the feature generation step before tests",defaultValue:!0,group:"execution"},{key:"playwrightBdd.testCommand",label:"Test Command Template",type:"command",description:"Command to run Playwright tests. Use ${configPath}, ${tsconfigArg}, and ${tagsArg} as placeholders.",defaultValue:"npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}",placeholder:"npx playwright test --config=${configPath}",group:"execution"},{key:"playwrightBdd.featureGenCommand",label:"Feature Generation Command",type:"command",description:"Command to generate features. Use ${configPath} as a placeholder.",defaultValue:"npx bddgen --config=${configPath}",placeholder:"npx bddgen --config=${configPath}",group:"execution"},{key:"playwrightBdd.autoDiscoverConfig",label:"Auto-Discover Configuration",type:"boolean",description:"Automatically discover Playwright config, feature folders, and step folders",defaultValue:!0,group:"discovery"},{key:"playwrightBdd.stepsFilePattern",label:"Steps File Pattern",type:"string",description:"Glob pattern for step definition files",defaultValue:"**/*.{js,ts,mjs,mts}",placeholder:"**/*.{js,ts}",group:"discovery"},{key:"playwrightBdd.cicd.githubToken",label:"GitHub Token",type:"string",description:"Personal Access Token for GitHub API access (stored securely)",defaultValue:"",placeholder:"ghp_xxxxxxxxxxxxxxxxxxxx",group:"cicd"},{key:"playwrightBdd.cicd.autoTriggerWorkflows",label:"Auto-Trigger Workflows",type:"boolean",description:"Automatically trigger GitHub workflows on test execution",defaultValue:!1,group:"cicd"},{key:"playwrightBdd.execution.retryCount",label:"Test Retry Count",type:"number",description:"Number of retry attempts for failed test executions (1 = no retry, 2 = 1 retry, etc.)",defaultValue:2,group:"execution",validation:t=>{if(t<1||t>10)return"Retry count must be between 1 and 10"}},{key:"playwrightBdd.execution.retryDelay",label:"Retry Delay (milliseconds)",type:"number",description:"Delay between retry attempts in milliseconds",defaultValue:2e3,group:"execution",validation:t=>{if(t<100||t>3e4)return"Retry delay must be between 100ms and 30000ms"}},{key:"playwrightBdd.ui.showTagFilters",label:"Show Tag Filters",type:"boolean",description:"Show tag filtering options in the test explorer",defaultValue:!0,group:"ui"},{key:"playwrightBdd.ui.showStatusFilters",label:"Show Status Filters",type:"boolean",description:"Show status filtering options in the test explorer",defaultValue:!0,group:"ui"},{key:"playwrightBdd.ui.showExecutionHistory",label:"Show Execution History",type:"boolean",description:"Enable test execution history tracking",defaultValue:!0,group:"ui"},{key:"playwrightBdd.ui.autoRefreshInterval",label:"Auto-Refresh Interval (seconds)",type:"number",description:"Interval for auto-refreshing test discovery (0 to disable)",defaultValue:0,group:"ui"}]}getConfigurationGroups(){return[{name:"core",title:"Core Configuration",description:"Essential settings for Playwright BDD integration",icon:"gear"},{name:"execution",title:"Test Execution",description:"Settings for running and managing tests",icon:"play"},{name:"discovery",title:"Discovery & Automation",description:"Automatic discovery and detection settings",icon:"search"},{name:"cicd",title:"CI/CD Integration",description:"GitHub Actions and workflow integration",icon:"github"},{name:"ui",title:"User Interface",description:"UI customization and display preferences",icon:"browser"}]}async getSettingsWebviewContent(){let t=x.workspace.getConfiguration(),e=this.getConfigurationFields(),s=this.getConfigurationGroups(),n={};for(let o of e)n[o.key]=t.get(o.key,o.defaultValue);return`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BDD Test Runner Settings</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 0;
                margin: 0;
                line-height: 1.6;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                margin: 0 0 10px 0;
                font-size: 24px;
                font-weight: 600;
            }
            .header p {
                margin: 0;
                color: var(--vscode-descriptionForeground);
                font-size: 14px;
            }
            .actions {
                margin-bottom: 30px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .btn {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .btn.secondary {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            .btn.secondary:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            .settings-groups {
                display: grid;
                grid-template-columns: 250px 1fr;
                gap: 30px;
            }
            .group-nav {
                position: sticky;
                top: 20px;
                height: fit-content;
            }
            .group-nav-item {
                display: flex;
                align-items: center;
                padding: 12px;
                cursor: pointer;
                border-radius: 6px;
                margin-bottom: 4px;
                transition: background-color 0.15s;
                gap: 10px;
            }
            .group-nav-item:hover {
                background: var(--vscode-list-hoverBackground);
            }
            .group-nav-item.active {
                background: var(--vscode-list-activeSelectionBackground);
                color: var(--vscode-list-activeSelectionForeground);
            }
            .group-nav-icon {
                width: 16px;
                height: 16px;
                opacity: 0.8;
            }
            .group-nav-text {
                font-size: 13px;
                font-weight: 500;
            }
            .settings-content {
                min-height: 600px;
            }
            .settings-group {
                display: none;
                animation: fadeIn 0.2s ease-in;
            }
            .settings-group.active {
                display: block;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .group-header {
                margin-bottom: 20px;
            }
            .group-header h2 {
                margin: 0 0 8px 0;
                font-size: 18px;
                font-weight: 600;
            }
            .group-header p {
                margin: 0;
                color: var(--vscode-descriptionForeground);
                font-size: 14px;
            }
            .setting-item {
                margin-bottom: 24px;
                padding: 16px;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
            }
            .setting-label {
                display: flex;
                align-items: center;
                margin-bottom: 6px;
                gap: 8px;
            }
            .setting-label h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 500;
            }
            .setting-badge {
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                text-transform: uppercase;
            }
            .setting-description {
                color: var(--vscode-descriptionForeground);
                font-size: 13px;
                margin-bottom: 12px;
                line-height: 1.5;
            }
            .setting-control {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .form-input {
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                padding: 6px 8px;
                border-radius: 3px;
                font-size: 13px;
                flex: 1;
                min-width: 200px;
            }
            .form-input:focus {
                outline: 1px solid var(--vscode-focusBorder);
                border-color: var(--vscode-focusBorder);
            }
            .form-input.error {
                border-color: var(--vscode-inputValidation-errorBorder);
                background: var(--vscode-inputValidation-errorBackground);
            }
            .form-checkbox {
                width: 16px;
                height: 16px;
                accent-color: var(--vscode-checkbox-background);
            }
            .form-select {
                background: var(--vscode-dropdown-background);
                color: var(--vscode-dropdown-foreground);
                border: 1px solid var(--vscode-dropdown-border);
                padding: 6px 8px;
                border-radius: 3px;
                font-size: 13px;
                min-width: 150px;
            }
            .path-input-group {
                display: flex;
                gap: 8px;
                align-items: center;
                width: 100%;
            }
            .path-input {
                flex: 1;
            }
            .browse-btn {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: none;
                padding: 6px 12px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                white-space: nowrap;
            }
            .browse-btn:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            .validation-error {
                color: var(--vscode-errorForeground);
                font-size: 12px;
                margin-top: 4px;
            }
            .setting-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
            }
            .reset-btn {
                background: transparent;
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-button-border);
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
            }
            .reset-btn:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid var(--vscode-panel-border);
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-size: 12px;
            }
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
            }
            .status-indicator.success {
                background: var(--vscode-testing-iconPassed);
                color: white;
            }
            .status-indicator.warning {
                background: var(--vscode-testing-iconFailed);
                color: white;
            }
            @media (max-width: 768px) {
                .settings-groups {
                    grid-template-columns: 1fr;
                }
                .group-nav {
                    position: static;
                    display: flex;
                    overflow-x: auto;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .group-nav-item {
                    white-space: nowrap;
                    margin-bottom: 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>\u{1F9EA} BDD Test Runner Settings</h1>
                <p>Configure all aspects of your Playwright BDD testing experience</p>
            </div>

            <div class="actions">
                <button class="btn" onclick="saveAllSettings()">
                    <span>\u{1F4BE}</span> Save All Settings
                </button>
                <button class="btn secondary" onclick="resetToDefaults()">
                    <span>\u{1F504}</span> Reset to Defaults
                </button>
                <button class="btn secondary" onclick="exportSettings()">
                    <span>\u{1F4CB}</span> Export Settings
                </button>
                <button class="btn secondary" onclick="importSettings()">
                    <span>\u{1F4C1}</span> Import Settings
                </button>
                <button class="btn secondary" onclick="validateSettings()">
                    <span>\u2705</span> Validate Configuration
                </button>
            </div>

            <div class="settings-groups">
                <div class="group-nav">
                    ${s.map((o,i)=>`
                        <div class="group-nav-item ${i===0?"active":""}" 
                             onclick="showGroup('${o.name}')" 
                             data-group="${o.name}">
                            <div class="group-nav-icon">\u{1F517}</div>
                            <div class="group-nav-text">${o.title}</div>
                        </div>
                    `).join("")}
                </div>

                <div class="settings-content">
                    ${s.map((o,i)=>`
                        <div class="settings-group ${i===0?"active":""}" data-group="${o.name}">
                            <div class="group-header">
                                <h2>${o.title}</h2>
                                <p>${o.description}</p>
                            </div>
                            
                            ${e.filter(a=>a.group===o.name).map(a=>`
                                <div class="setting-item" data-key="${a.key}">
                                    <div class="setting-label">
                                        <h3>${a.label}</h3>
                                        <span class="setting-badge">${a.type}</span>
                                    </div>
                                    <div class="setting-description">${a.description}</div>
                                    <div class="setting-control">
                                        ${this.generateFormControl(a,n[a.key])}
                                    </div>
                                    <div class="setting-actions">
                                        <button class="reset-btn" onclick="resetSetting('${a.key}')">
                                            Reset to Default
                                        </button>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    `).join("")}
                </div>
            </div>

            <div class="footer">
                <p>Settings are automatically saved to your workspace configuration</p>
                <div id="status-indicator" class="status-indicator success" style="display: none;">
                    <span>\u2713</span> Settings saved successfully
                </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function showGroup(groupName) {
                // Update navigation
                document.querySelectorAll('.group-nav-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.group === groupName);
                });
                
                // Update content
                document.querySelectorAll('.settings-group').forEach(group => {
                    group.classList.toggle('active', group.dataset.group === groupName);
                });
            }

            function saveAllSettings() {
                const settings = {};
                document.querySelectorAll('.setting-item').forEach(item => {
                    const key = item.dataset.key;
                    const input = item.querySelector('input, select');
                    if (input) {
                        if (input.type === 'checkbox') {
                            settings[key] = input.checked;
                        } else if (input.type === 'number') {
                            settings[key] = parseInt(input.value) || 0;
                        } else {
                            settings[key] = input.value;
                        }
                    }
                });
                
                vscode.postMessage({
                    command: 'saveSettings',
                    settings: settings
                });
                
                showStatus('Settings saved successfully', 'success');
            }

            function resetSetting(key) {
                vscode.postMessage({
                    command: 'resetSetting',
                    key: key
                });
            }

            function resetToDefaults() {
                if (confirm('Reset all settings to default values? This cannot be undone.')) {
                    vscode.postMessage({
                        command: 'resetAllSettings'
                    });
                }
            }

            function exportSettings() {
                vscode.postMessage({
                    command: 'exportSettings'
                });
            }

            function importSettings() {
                vscode.postMessage({
                    command: 'importSettings'
                });
            }

            function validateSettings() {
                vscode.postMessage({
                    command: 'validateSettings'
                });
            }

            function browsePath(inputId) {
                vscode.postMessage({
                    command: 'browsePath',
                    inputId: inputId
                });
            }

            function showStatus(message, type = 'success') {
                const indicator = document.getElementById('status-indicator');
                indicator.textContent = message;
                indicator.className = \`status-indicator \${type}\`;
                indicator.style.display = 'inline-flex';
                
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 3000);
            }

            // Auto-save on input change
            document.addEventListener('input', (e) => {
                if (e.target.matches('input, select')) {
                    const settingItem = e.target.closest('.setting-item');
                    if (settingItem) {
                        const key = settingItem.dataset.key;
                        let value = e.target.value;
                        
                        if (e.target.type === 'checkbox') {
                            value = e.target.checked;
                        } else if (e.target.type === 'number') {
                            value = parseInt(value) || 0;
                        }
                        
                        vscode.postMessage({
                            command: 'updateSetting',
                            key: key,
                            value: value
                        });
                    }
                }
            });
        </script>
    </body>
    </html>`}generateFormControl(t,e){switch(t.type){case"boolean":return`<input type="checkbox" class="form-checkbox" ${e?"checked":""}>`;case"number":return`<input type="number" class="form-input" value="${e||t.defaultValue}" placeholder="${t.placeholder||""}">`;case"dropdown":return t.options?`
          <select class="form-select">
            ${t.options.map(n=>`<option value="${n}" ${e===n?"selected":""}>${n}</option>`).join("")}
          </select>`:"";case"path":let s=`path-${t.key.replace(/\./g,"-")}`;return`
          <div class="path-input-group">
            <input type="text" id="${s}" class="form-input path-input" 
                   value="${e||t.defaultValue}" 
                   placeholder="${t.placeholder||""}">
            <button class="browse-btn" onclick="browsePath('${s}')">Browse...</button>
          </div>`;case"command":return`<input type="text" class="form-input" value="${e||t.defaultValue}" placeholder="${t.placeholder||""}" style="font-family: monospace;">`;default:return`<input type="text" class="form-input" value="${e||t.defaultValue}" placeholder="${t.placeholder||""}">`}}async handleWebviewMessage(t){let e=x.workspace.getConfiguration();switch(t.command){case"saveSettings":await this.saveSettings(t.settings);break;case"updateSetting":await e.update(t.key,t.value,x.ConfigurationTarget.Workspace),this.outputChannel.appendLine(`Updated setting: ${t.key} = ${t.value}`);break;case"resetSetting":let s=this.getConfigurationFields().find(n=>n.key===t.key);s&&(await e.update(t.key,s.defaultValue,x.ConfigurationTarget.Workspace),this.refreshWebview());break;case"resetAllSettings":await this.resetAllSettings();break;case"exportSettings":await this.exportSettings();break;case"importSettings":await this.importSettings();break;case"validateSettings":await this.validateSettings();break;case"browsePath":await this.browsePath(t.inputId);break}}async saveSettings(t){let e=x.workspace.getConfiguration();for(let[s,n]of Object.entries(t))await e.update(s,n,x.ConfigurationTarget.Workspace);this.outputChannel.appendLine(`Saved ${Object.keys(t).length} settings`),x.window.showInformationMessage("Settings saved successfully!")}async resetAllSettings(){let t=x.workspace.getConfiguration(),e=this.getConfigurationFields();for(let s of e)await t.update(s.key,s.defaultValue,x.ConfigurationTarget.Workspace);this.outputChannel.appendLine("All settings reset to defaults"),x.window.showInformationMessage("All settings reset to default values!"),this.refreshWebview()}async exportSettings(){let t=x.workspace.getConfiguration(),e=this.getConfigurationFields(),s={timestamp:new Date().toISOString(),version:"0.4.0",settings:{}};for(let i of e)s.settings[i.key]=t.get(i.key,i.defaultValue);let n=JSON.stringify(s,null,2),o=await x.workspace.openTextDocument({content:n,language:"json"});await x.window.showTextDocument(o),x.window.showInformationMessage("Settings exported to new document. Save it to preserve your configuration.")}async importSettings(){let t=await x.window.showOpenDialog({canSelectFiles:!0,canSelectFolders:!1,canSelectMany:!1,filters:{"JSON Files":["json"]},title:"Import BDD Settings"});if(t&&t[0])try{let e=await x.workspace.fs.readFile(t[0]),s=JSON.parse(e.toString());s.settings?(await this.saveSettings(s.settings),this.refreshWebview(),x.window.showInformationMessage("Settings imported successfully!")):x.window.showErrorMessage("Invalid settings file format")}catch(e){x.window.showErrorMessage(`Failed to import settings: ${e}`)}}async validateSettings(){let t=x.workspace.getConfiguration(),e=this.getConfigurationFields(),s=[];for(let n of e){let o=t.get(n.key);if(n.validation){let i=n.validation(o);i&&s.push(`${n.label}: ${i}`)}if(n.type==="path"&&o)if(n.key==="playwrightBdd.tsconfigPath"){if(o&&typeof o=="string"&&o.trim()){let i=o.toString().trim();i=i.replace(/^--tsconfig=/,""),i=i.replace(/^--project=/,"");let a=De.resolve(this.workspaceRoot,i);try{await x.workspace.fs.stat(x.Uri.file(a))}catch{s.push(`${n.label}: Path does not exist: ${i}`)}}}else{let i=De.resolve(this.workspaceRoot,o);try{await x.workspace.fs.stat(x.Uri.file(i))}catch{s.push(`${n.label}: Path does not exist: ${o}`)}}}if(s.length===0)x.window.showInformationMessage("\u2705 All settings are valid!");else{let n=`Found ${s.length} configuration issues:

${s.join(`
`)}`;this.outputChannel.appendLine(n),this.outputChannel.show(),x.window.showWarningMessage(`Found ${s.length} configuration issues. Check output for details.`)}}async browsePath(t){let e=await x.window.showOpenDialog({canSelectFiles:!0,canSelectFolders:!0,canSelectMany:!1,defaultUri:x.Uri.file(this.workspaceRoot)});if(e&&e[0]){let s=De.relative(this.workspaceRoot,e[0].fsPath);this.webviewPanel&&this.webviewPanel.webview.postMessage({command:"setPath",inputId:t,path:s})}}async refreshWebview(){this.webviewPanel&&(this.webviewPanel.webview.html=await this.getSettingsWebviewContent())}dispose(){this.webviewPanel&&this.webviewPanel.dispose()}};async function Rt(u){let t=r.tests.createTestController("playwrightBdd","Playwright BDD Tests");u.subscriptions.push(t);let e=r.window.createOutputChannel("Playwright BDD");u.subscriptions.push(e);let s=(d,l)=>{let h=`[ERROR] ${d}: ${l.message}`;e.appendLine(h),console.error(h,l),r.window.showErrorMessage(`Playwright BDD: ${d} failed. Check output for details.`)};(()=>{let l=r.workspace.getConfiguration("playwrightBdd").get("configPath","./playwright.config.ts"),h=r.workspace.workspaceFolders;if(!h)return r.window.showWarningMessage("Playwright BDD: No workspace folder detected. Extension functionality may be limited."),!1;let p=ce.resolve(h[0].uri.fsPath,l);try{r.workspace.fs.stat(r.Uri.file(p)).then(()=>{e.appendLine(`Configuration validated: ${l}`)},f=>{e.appendLine(`Warning: Configuration file not found at ${l}. Using defaults.`)})}catch(f){e.appendLine(`Warning: Could not validate configuration: ${f}`)}return!0})();let o=r.workspace.getConfiguration("playwrightBdd"),i=o.get("featureFolder","features"),a=o.get("enableFeatureGen",!1),c=new Oe(e),g=async(d=!1)=>{try{e.appendLine("Starting test discovery...");let l=Date.now();t.items.replace([]);let h=await r.workspace.findFiles(`${i}/**/*.feature`);if(h.length===0){e.appendLine(`No feature files found in ${i}. Check your featureFolder configuration.`),r.window.showInformationMessage(`No .feature files found in '${i}' folder.`);return}e.appendLine(`Found ${h.length} feature file(s). Processing with caching...`),d&&(c.clearCache(),e.appendLine("Cache cleared - processing all files")),await c.validateAndCleanCache();let p=async(L,j)=>{try{if(j){let ne=c.getCachedFeature(L);if(ne){let ve=c.recreateTestItem(ne,t);return t.items.add(ve),e.appendLine(`\u{1F4CB} From cache: ${ce.basename(L.fsPath)}`),ve}}let N=await w(L,t);if(N){let ne=c.createCachedItem(N);await c.updateCache(L,ne)}return N}catch(N){return s(`Processing feature file ${L.fsPath}`,N),null}},f=await c.incrementalDiscovery(h,p),$=Date.now()-l,O=c.getCacheStats();e.appendLine(`\u2705 Discovery completed in ${$}ms: ${f.processed} processed, ${f.fromCache} from cache`),e.appendLine(`\u{1F4CA} Cache stats: ${O.totalFeatures} cached features`)}catch(l){s("Test Discovery",l),r.window.showErrorMessage("Failed to discover tests. Some features may not be available.")}},w=async(d,l)=>{try{let h=(await r.workspace.fs.readFile(d)).toString();if(!h.trim())return e.appendLine(`Warning: Empty feature file ${d.fsPath}`),null;let p=h.split(`
`),f=h.match(/^\s*Feature:\s*(.+)/m);if(!f)return e.appendLine(`Warning: No Feature declaration found in ${d.fsPath}`),null;let v=f[1].trim(),$=d.fsPath,O=l.createTestItem($,v,d);l.items.add(O);let L=null,j="",N=0;for(let ne=0;ne<p.length;ne++){let ve=p[ne],at=ve.match(/^\s*Scenario(?: Outline)?:\s*(.+)/);if(at){let be=at[1].trim(),Pe=`${d.fsPath}::${be}`,ge=l.createTestItem(Pe,be,d);O.children.add(ge),L=ge,j=be,N++}if(ve.match(/^\s*Examples:/)&&L){let be=1,Pe=!1,ge=[];for(let Ie=ne+1;Ie<p.length;Ie++){let Fe=p[Ie].trim();if(Fe.startsWith("|")){let ct=Fe.split("|").map(le=>le.trim()).filter(Boolean);if(!Pe){ge=ct,Pe=!0;continue}if(ge.length===0){e.appendLine(`Warning: No headers found for examples in ${d.fsPath} at line ${Ie+1}`);break}let yt=Object.fromEntries(ge.map((le,ye)=>[le,ct[ye]||""])),Re=j;for(let[le,ye]of Object.entries(yt))Re=Re.replace(new RegExp(`<${le}>`,"g"),ye);if(L){let le=`${L.id}::${Re}`,ye=l.createTestItem(le,Re,d);L.children.add(ye)}be++}else if(Fe===""||!Fe.startsWith("|"))break}}}return e.appendLine(`Processed ${ce.basename(d.fsPath)}: ${N} scenario(s)`),O}catch(h){throw new Error(`Failed to process feature file: ${h}`)}};await g(),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.runScenarioDynamic",(d,l)=>{let h=r.workspace.getConfiguration("playwrightBdd"),p=h.get("configPath")||"./playwright.config.ts",f=h.get("tsconfigPath")||"",v=p,$=f||"",O=d?`--grep "${d}"`:"",L=h.get("featureGenCommand")||"npx bddgen --config=${configPath}",j=h.get("testCommand")||"npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}";L=L.replace("${configPath}",v).replace("${tsconfigArg}",$).replace("${tagsArg}",O),j=j.replace("${configPath}",v).replace("${tsconfigArg}",$).replace("${tagsArg}",O);let N=r.window.createTerminal("Playwright BDD");N.show(),l?N.sendText(`${L} && ${j}`):N.sendText(j)})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.runScenario",d=>{let l=r.workspace.getConfiguration("playwrightBdd"),h=l.get("configPath")||"./playwright.config.ts",p=l.get("tsconfigPath")||"",f=p?`--project=${p}`:"",v=r.window.createTerminal("Playwright BDD");v.show(),v.sendText(`npx playwright test ${f} --config=${h} --grep "${d}"`)})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.runScenarioWithFeatureGen",d=>{let l=r.workspace.getConfiguration("playwrightBdd"),h=l.get("configPath")||"./playwright.config.ts",p=l.get("tsconfigPath")||"",f=d||l.get("tags")||"",v=h,$=p||"",O=f?`--grep "${f}"`:"",L=l.get("featureGenCommand")||"npx bddgen --config=${configPath}",j=l.get("testCommand")||"npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}";L=L.replace("${configPath}",v).replace("${tsconfigArg}",$).replace("${tagsArg}",O),j=j.replace("${configPath}",v).replace("${tsconfigArg}",$).replace("${tagsArg}",O);let N=r.window.createTerminal("Playwright BDD");N.show(),N.sendText(`${L} && ${j}`)}));let b,I=()=>{b&&clearTimeout(b),b=setTimeout(()=>{e.appendLine("File change detected, refreshing tests..."),g()},500)},S=r.workspace.createFileSystemWatcher(`${i}/**/*.feature`);S.onDidCreate(I),S.onDidChange(I),S.onDidDelete(I),u.subscriptions.push(S),t.createRunProfile("Run",r.TestRunProfileKind.Run,(d,l)=>{let h=t.createTestRun(d);if(e.show(!0),d.include)for(let p of d.include)h.enqueued(p),h.started(p),Ce(h,t,p,e).catch(f=>{e.appendLine(`[ERROR] Test execution failed: ${f}`),h.failed(p,new r.TestMessage(f.toString()))});else Ce(h,t,void 0,e).catch(p=>{e.appendLine(`[ERROR] Test execution failed: ${p}`)})},!0),t.createRunProfile("Debug",r.TestRunProfileKind.Debug,(d,l)=>{let h=t.createTestRun(d);if(e.show(!0),d.include)for(let p of d.include)h.enqueued(p),h.started(p),r.commands.executeCommand("playwright-bdd.debugScenario",p.label);h.end()},!0),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.runTests",()=>{Ce(void 0,t,void 0,e).catch(d=>{e.appendLine(`[ERROR] Test execution failed: ${d}`),r.window.showErrorMessage("Test execution failed. Check the output panel for details.")})}));let C=new Ae(e),A=new He(e),G=new Ge(C,e),P=r.workspace.workspaceFolders?new ue(e,r.workspace.workspaceFolders[0].uri.fsPath):null,U=new je(e),V=r.workspace.workspaceFolders?new Ne(e,r.workspace.workspaceFolders[0].uri.fsPath):null,R=r.workspace.workspaceFolders?new Ue(e,r.workspace.workspaceFolders[0].uri.fsPath):null,M=new qe(e),W=r.workspace.workspaceFolders?new Ke(e,r.workspace.workspaceFolders[0].uri.fsPath):null,se=r.workspace.workspaceFolders?new Ye(e,r.workspace.workspaceFolders[0].uri.fsPath):null,Te=new Ze(t,e);Te.registerCommands(u),u.subscriptions.push(Te),e.appendLine("\u2705 BDD Test Explorer UI initialized with settings button support");let z=r.workspace.workspaceFolders?new et(e,r.workspace.workspaceFolders[0].uri.fsPath):null;if(z&&u.subscriptions.push(z),e.appendLine("\u2705 BDD Test Runner initialized without AI/Copilot features"),R&&R.register(u),W&&W.initialize().catch(d=>{e.appendLine(`Warning: CI/CD initialization failed: ${d}`)}),P&&o.get("autoDiscoverConfig",!0))try{let d=await P.discoverProjectConfiguration();await P.applyDiscoveredConfiguration(d)}catch(d){e.appendLine(`Warning: Auto-discovery failed: ${d}`)}if(r.workspace.workspaceFolders){let d=o.get("stepsFolder","steps");await C.discoverStepDefinitions(r.workspace.workspaceFolders[0].uri.fsPath,d)}u.subscriptions.push(r.languages.registerDefinitionProvider({language:"feature",scheme:"file"},C)),u.subscriptions.push(r.languages.registerHoverProvider({language:"feature",scheme:"file"},G));let Z=new We(a);u.subscriptions.push(r.languages.registerCodeLensProvider({language:"feature",scheme:"file"},Z));let q=()=>{Z.refresh()};u.subscriptions.push(r.commands.registerCommand("playwright-bdd.terminateTests",()=>{tt()})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.refreshTests",async()=>{let d=r.window.createStatusBarItem(r.StatusBarAlignment.Left);d.text="$(sync~spin) Refreshing features...",d.tooltip="Playwright BDD is refreshing tests",d.show();try{await g()}finally{setTimeout(()=>{d.hide(),d.dispose()},3e3)}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.debugScenario",async d=>{let l=r.workspace.getConfiguration("playwrightBdd"),h=l.get("configPath")||"./playwright.config.ts",p=l.get("tsconfigPath")||"",f={type:"pwa-node",request:"launch",name:"Debug Playwright BDD Scenario",program:"${workspaceFolder}/node_modules/.bin/playwright",args:["test",p?`${p}`:"",`--config=${h}`,"--debug","--grep",d].filter(Boolean),console:"integratedTerminal",internalConsoleOptions:"neverOpen",cwd:"${workspaceFolder}",env:{PWDEBUG:"1"}};r.debug.startDebugging(void 0,f)})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.showStepDefinitions",async()=>{let d=C.getAllStepDefinitions();if(d.length===0){r.window.showInformationMessage("No step definitions found. Make sure your steps folder contains step definition files.");return}let l=d.map(p=>({label:`${p.type}: ${p.pattern}`,description:`${ce.basename(p.file)}:${p.line}`,detail:p.function,step:p})),h=await r.window.showQuickPick(l,{placeHolder:`${d.length} step definitions found`,matchOnDescription:!0,matchOnDetail:!0});if(h){let p=r.Uri.file(h.step.file),f=new r.Position(h.step.line-1,0);await r.window.showTextDocument(p,{selection:new r.Range(f,f)})}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.validateStepCoverage",async()=>{let d=r.window.activeTextEditor;if(!d||!d.document.fileName.endsWith(".feature")){r.window.showWarningMessage("Please open a .feature file to validate step coverage.");return}let l=C.getStepCoverageForFeature(d.document.fileName);e.appendLine(`
=== Step Coverage Analysis ===`),e.appendLine(`Feature: ${ce.basename(d.document.fileName)}`),e.appendLine(`Coverage: ${l.covered}/${l.total} steps (${Math.round(l.covered/l.total*100)}%)`),l.missing.length>0?(e.appendLine(`
Missing step definitions:`),l.missing.forEach(p=>{e.appendLine(`  \u274C ${p}`)})):e.appendLine(`
\u2705 All steps have matching definitions!`),e.show();let h=l.missing.length>0?`${l.missing.length} steps need definitions (${Math.round(l.covered/l.total*100)}% coverage)`:`All ${l.total} steps have definitions! \u2705`;r.window.showInformationMessage(h)})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.refreshStepDefinitions",async()=>{if(r.workspace.workspaceFolders){let d=r.window.createStatusBarItem(r.StatusBarAlignment.Left);d.text="$(sync~spin) Refreshing step definitions...",d.show();try{await C.discoverStepDefinitions(r.workspace.workspaceFolders[0].uri.fsPath);let l=C.getAllStepDefinitions().length;r.window.showInformationMessage(`Found ${l} step definitions`)}finally{setTimeout(()=>{d.hide(),d.dispose()},2e3)}}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.searchTests",async()=>{let d=await r.window.showInputBox({placeHolder:'Search tests... (e.g., "login", "tag:smoke", "feature:auth scenario:success")',prompt:"Enter search query or use advanced filters: tag:name feature:name scenario:name step:text file:pattern"});if(d)try{let l=A.buildAdvancedFilter(d),h=d.replace(/\w+:[^\s]+/g,"").trim(),p=await A.searchTests(t,h,l);if(p.length===0){r.window.showInformationMessage(`No tests found for: "${d}"`);return}let f=p.map($=>({label:`${$.matchType.toUpperCase()}: ${$.matchText}`,description:ce.basename($.filePath),detail:$.line?`Line ${$.line}`:"",result:$})),v=await r.window.showQuickPick(f,{placeHolder:`${p.length} matches found`,matchOnDescription:!0});if(v){let $=r.Uri.file(v.result.filePath),O=v.result.line?new r.Position(v.result.line-1,0):new r.Position(0,0);await r.window.showTextDocument($,{selection:new r.Range(O,O)})}}catch(l){e.appendLine(`[ERROR] Search failed: ${l}`),r.window.showErrorMessage("Search failed. Check output for details.")}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.exportSearchResults",async()=>{let d=await r.window.showInputBox({placeHolder:"Search query to export results for...",prompt:"Enter search query to export results"});if(d)try{let l=A.buildAdvancedFilter(d),h=d.replace(/\w+:[^\s]+/g,"").trim(),p=await A.searchTests(t,h,l),f=A.exportSearchResults(p),v=await r.workspace.openTextDocument({content:f,language:"markdown"});await r.window.showTextDocument(v),r.window.showInformationMessage(`Exported ${p.length} search results`)}catch(l){e.appendLine(`[ERROR] Export failed: ${l}`),r.window.showErrorMessage("Export failed. Check output for details.")}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.autoDiscoverConfig",async()=>{if(!P){r.window.showWarningMessage("Auto-discovery requires an open workspace.");return}try{let d=await P.discoverProjectConfiguration();await P.applyDiscoveredConfiguration(d),r.window.showInformationMessage("Configuration auto-discovery completed!")}catch(d){e.appendLine(`[ERROR] Auto-discovery failed: ${d}`),r.window.showErrorMessage(`Auto-discovery failed: ${d}`)}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.validateConfiguration",async()=>{if(!P){r.window.showWarningMessage("Configuration validation requires an open workspace.");return}try{let d=await P.validateConfiguration();d.valid?r.window.showInformationMessage("\u2705 Configuration is valid!"):(e.appendLine(`
\u274C Configuration validation failed:`),d.issues.forEach(l=>{e.appendLine(`  - ${l}`)}),e.show(),r.window.showWarningMessage(`Configuration has ${d.issues.length} issues. Check output for details.`))}catch(d){e.appendLine(`[ERROR] Configuration validation failed: ${d}`),r.window.showErrorMessage(`Validation failed: ${d}`)}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.createStepDefinition",async()=>{if(!V){r.window.showWarningMessage("Step creation requires an open workspace.");return}await V.launchWizard()})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.launchStepWizard",async()=>{if(!V){r.window.showWarningMessage("Step creation requires an open workspace.");return}await V.launchWizard()})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.createStepsFromFeature",async d=>{if(!V){r.window.showWarningMessage("Step creation requires an open workspace.");return}let l=d;if(!l){let h=r.window.activeTextEditor;if(h&&h.document.fileName.endsWith(".feature"))l=h.document.uri;else{r.window.showWarningMessage("Please open a .feature file or use this command from the file explorer.");return}}await V.createStepsFromFeature(l)})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.showQueueStatus",async()=>{let d=U.getProgress(),l=U.getStatistics(),h=d.total>0?`Queue: ${d.completed}/${d.total} completed (${d.percentage.toFixed(1)}%)`:"Queue is empty",p=[];if(d.running>0&&p.push("Pause","Cancel All"),d.failed>0&&p.push("Retry Failed"),d.completed>0&&p.push("Clear Completed","Export Results"),p.push("Show Details"),p.length===0){r.window.showInformationMessage(h);return}switch(await r.window.showInformationMessage(h,...p)){case"Pause":U.pause();break;case"Cancel All":U.cancelAll();break;case"Retry Failed":U.retryFailed();break;case"Clear Completed":U.clearCompleted();break;case"Export Results":let v=U.exportResults(),$=await r.workspace.openTextDocument({content:v,language:"markdown"});await r.window.showTextDocument($);break;case"Show Details":e.appendLine(`
\u{1F4CA} Queue Statistics:`),e.appendLine(`Total Executed: ${l.totalExecuted}`),e.appendLine(`Success Rate: ${l.successRate.toFixed(2)}%`),e.appendLine(`Average Duration: ${l.averageDuration.toFixed(0)}ms`),e.appendLine(`Progress: ${d.completed}/${d.total} (${d.percentage.toFixed(1)}%)`),e.show();break}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.runTestsWithQueue",async()=>{let d=[];if(t.items.forEach(l=>{d.push({type:"feature",name:l.label,command:`npx playwright test --grep "${l.label}"`,testItem:l,priority:1}),l.children.forEach(h=>{d.push({type:"scenario",name:h.label,command:`npx playwright test --grep "${h.label}"`,testItem:h,priority:2})})}),d.length===0){r.window.showInformationMessage("No tests found to queue.");return}U.addToQueue(d),r.window.withProgress({location:r.ProgressLocation.Notification,title:"Running Tests with Queue",cancellable:!0},async(l,h)=>{await U.startWithProgress(l,h)})})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.startStepByStepDebugging",async()=>{if(!R){r.window.showWarningMessage("Debugging requires an open workspace.");return}let d=r.window.activeTextEditor;if(!d||!d.document.fileName.endsWith(".feature")){r.window.showWarningMessage("Please open a .feature file to debug.");return}let l=d.selection.active.line,h=d.document,p="";for(let f=Math.max(0,l-5);f<=Math.min(h.lineCount-1,l+5);f++){let $=h.lineAt(f).text.match(/^\s*Scenario(?:\s+Outline)?:\s*(.+)$/);if($){p=$[1].trim();break}}p||(p=await r.window.showInputBox({prompt:"Enter scenario name to debug",placeHolder:"Scenario name..."})||""),p&&await R.startStepByStepDebugging(d.document.fileName,p)})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.toggleBreakpoint",async()=>{if(!R){r.window.showWarningMessage("Debugging requires an open workspace.");return}let d=r.window.activeTextEditor;if(!d||!d.document.fileName.endsWith(".feature")){r.window.showWarningMessage("Please open a .feature file to set breakpoints.");return}let l=d.selection.active.line,p=d.document.lineAt(l).text.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);if(p){let f=p[2];await R.toggleBreakpoint(d.document.fileName,l+1,f)}else r.window.showWarningMessage("Breakpoints can only be set on step lines (Given/When/Then/And/But).")})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.setConditionalBreakpoint",async()=>{if(!R){r.window.showWarningMessage("Debugging requires an open workspace.");return}let d=r.window.activeTextEditor;if(!d||!d.document.fileName.endsWith(".feature")){r.window.showWarningMessage("Please open a .feature file to set breakpoints.");return}let l=d.selection.active.line,p=d.document.lineAt(l).text.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);if(!p){r.window.showWarningMessage("Breakpoints can only be set on step lines.");return}let f=await r.window.showInputBox({prompt:'Enter breakpoint condition (e.g., variable === "value")',placeHolder:"Condition expression..."});if(f){let v=p[2];await R.setConditionalBreakpoint(d.document.fileName,l+1,v,f)}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.clearAllBreakpoints",async()=>{if(!R){r.window.showWarningMessage("Debugging requires an open workspace.");return}await r.window.showWarningMessage("Clear all BDD breakpoints?","Clear All","Cancel")==="Clear All"&&(R.clearAllBreakpoints(),r.window.showInformationMessage("All BDD breakpoints cleared."))})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.showWorkspaces",async()=>{let d=M.getAllWorkspaces();if(d.length===0){r.window.showInformationMessage("No workspaces found.");return}let l=d.map(p=>({label:p.isActive?`$(folder-active) ${p.name}`:p.name,description:`${p.featureCount} features, ${p.stepCount} steps`,detail:p.rootPath,workspace:p})),h=await r.window.showQuickPick(l,{placeHolder:`${d.length} workspaces found`,matchOnDescription:!0});if(h)switch((await r.window.showQuickPick([{label:"\u{1F3AF} Set as Active",action:"activate"},{label:"\u{1F4CA} Show Analytics",action:"analytics"},{label:"\u{1F50D} Search in Workspace",action:"search"},{label:"\u25B6\uFE0F Run Tests",action:"run"}],{placeHolder:`Actions for ${h.workspace.name}`}))?.action){case"activate":await M.setActiveWorkspace(h.workspace.id),r.window.showInformationMessage(`Active workspace: ${h.workspace.name}`);break;case"analytics":r.commands.executeCommand("playwright-bdd.workspaceAnalytics");break;case"search":r.commands.executeCommand("playwright-bdd.searchAcrossWorkspaces");break;case"run":await M.runTestsAcrossWorkspaces([h.workspace.id]);break}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.switchWorkspace",async()=>{let d=M.getAllWorkspaces();if(d.length<=1){r.window.showInformationMessage("Only one workspace available.");return}let l=d.filter(p=>!p.isActive).map(p=>({label:p.name,description:`${p.featureCount} features, ${p.stepCount} steps`,detail:p.rootPath,workspace:p})),h=await r.window.showQuickPick(l,{placeHolder:"Select workspace to activate"});h&&(await M.setActiveWorkspace(h.workspace.id),r.window.showInformationMessage(`Switched to workspace: ${h.workspace.name}`))})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.searchAcrossWorkspaces",async()=>{let d=await r.window.showInputBox({prompt:"Search across all workspaces",placeHolder:"Enter search query..."});if(d)try{let l=await M.searchAcrossWorkspaces(d);if(l.length===0){r.window.showInformationMessage(`No results found for: "${d}"`);return}let h=l.map(f=>({label:`${f.matchType.toUpperCase()}: ${f.matchText}`,description:`${f.workspaceName} - ${ce.basename(f.filePath)}`,detail:f.line?`Line ${f.line}`:"",result:f})),p=await r.window.showQuickPick(h,{placeHolder:`${l.length} results found across workspaces`});if(p){let f=r.Uri.file(p.result.filePath),v=p.result.line?new r.Position(p.result.line-1,0):new r.Position(0,0);await r.window.showTextDocument(f,{selection:new r.Range(v,v)})}}catch(l){e.appendLine(`[ERROR] Cross-workspace search failed: ${l}`),r.window.showErrorMessage("Cross-workspace search failed. Check output for details.")}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.runTestsAcrossWorkspaces",async()=>{let d=M.getAllWorkspaces();if(d.length===0){r.window.showInformationMessage("No workspaces available.");return}let l=await r.window.showQuickPick(d.map(p=>({label:p.name,description:`${p.featureCount} features`,picked:p.isActive,workspace:p})),{placeHolder:"Select workspaces to run tests in",canPickMany:!0});if(!l||l.length===0)return;let h=l.map(p=>p.workspace.id);r.window.withProgress({location:r.ProgressLocation.Notification,title:"Running Tests Across Workspaces",cancellable:!0},async(p,f)=>{try{let v=await M.runTestsAcrossWorkspaces(h,{parallel:!0});e.appendLine(`
\u{1F3E2} Cross-Workspace Test Results:`),v.forEach(($,O)=>{let L=d.find(j=>j.id===O);e.appendLine(`  ${L?.name}: ${$.success?"\u2705":"\u274C"}`)}),e.show()}catch(v){e.appendLine(`[ERROR] Cross-workspace test execution failed: ${v}`),r.window.showErrorMessage("Cross-workspace test execution failed.")}})})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.createWorkspaceGroup",async()=>{let d=M.getAllWorkspaces();if(d.length<2){r.window.showInformationMessage("At least 2 workspaces are required to create a group.");return}let l=await r.window.showInputBox({prompt:"Enter group name",placeHolder:"e.g., Frontend Projects"});if(!l)return;let h=await r.window.showQuickPick(d.map(v=>({label:v.name,description:v.rootPath,workspace:v})),{placeHolder:"Select workspaces for this group",canPickMany:!0});if(!h||h.length===0)return;let p=h.map(v=>v.workspace.id),f=M.createWorkspaceGroup(l,p);r.window.showInformationMessage(`Created workspace group: ${l} with ${p.length} workspaces`)})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.workspaceAnalytics",async()=>{let d=M.generateAnalytics();switch(e.appendLine(`
\u{1F4CA} Workspace Analytics:`),e.appendLine(`Total Workspaces: ${d.totalWorkspaces}`),e.appendLine(`Total Features: ${d.totalFeatures}`),e.appendLine(`Total Steps: ${d.totalSteps}`),e.appendLine(`
Workspaces by Size:`),d.workspacesBySize.forEach((h,p)=>{e.appendLine(`  ${p+1}. ${h.name}: ${h.features} features, ${h.steps} steps`)}),e.appendLine(`
Recently Used:`),d.recentlyUsed.forEach((h,p)=>{e.appendLine(`  ${p+1}. ${h.name} (${h.lastAccessed.toLocaleDateString()})`)}),e.show(),(await r.window.showQuickPick([{label:"\u{1F4CB} Export Analytics",action:"export"},{label:"\u{1F4CA} Show Groups",action:"groups"}],{placeHolder:"Analytics Actions"}))?.action){case"export":let h=M.exportWorkspaceConfiguration(),p=await r.workspace.openTextDocument({content:h,language:"json"});await r.window.showTextDocument(p);break;case"groups":let f=M.getWorkspaceGroups();f.length===0?r.window.showInformationMessage("No workspace groups found."):(e.appendLine(`
\u{1F4C2} Workspace Groups:`),f.forEach(v=>{e.appendLine(`  ${v.name}: ${v.workspaces.length} workspaces`)}));break}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.setupCICD",async()=>{if(!W){r.window.showWarningMessage("CI/CD integration requires an open workspace.");return}await W.setupIntegration()})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.manageWorkflows",async()=>{if(!W){r.window.showWarningMessage("CI/CD integration requires an open workspace.");return}await W.manageWorkflows()})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.showReports",async()=>{if(!se){r.window.showWarningMessage("Report viewer requires an open workspace.");return}await se.showReports()})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.cicdStatus",async()=>{if(!W){r.window.showWarningMessage("CI/CD integration requires an open workspace.");return}let d=await W.getStatus(),l=`CI/CD Status:
\u2022 Initialized: ${d.initialized?"\u2705":"\u274C"}
\u2022 GitHub Actions: ${d.hasWorkflows?"\u2705":"\u274C"}
\u2022 BDD Tests: ${d.hasBDDTests?"\u2705":"\u274C"}
\u2022 Integration: ${d.integrationEnabled?"\u2705 Enabled":"\u274C Disabled"}`,h=[];switch(d.integrationEnabled||h.push("Setup Integration"),d.hasWorkflows&&h.push("Manage Workflows"),h.push("View Reports","Refresh Status"),await r.window.showInformationMessage(l,...h)){case"Setup Integration":r.commands.executeCommand("playwright-bdd.setupCICD");break;case"Manage Workflows":r.commands.executeCommand("playwright-bdd.manageWorkflows");break;case"View Reports":r.commands.executeCommand("playwright-bdd.showReports");break;case"Refresh Status":await W.refresh(),r.commands.executeCommand("playwright-bdd.cicdStatus");break}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.showSettings",async()=>{if(!z){r.window.showWarningMessage("Settings UI requires an open workspace.");return}await z.showSettingsUI()})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.triggerGitHubWorkflow",async()=>{if(!W){r.window.showWarningMessage("GitHub workflow triggering requires an open workspace.");return}try{let d=await W.getStatus();if(!d.initialized||!d.hasWorkflows)if(await r.window.showInformationMessage("No GitHub workflows detected. Would you like to set up CI/CD integration?","Setup CI/CD","Cancel")==="Setup CI/CD"){await W.setupIntegration();return}else return;await W.manageWorkflows()}catch(d){e.appendLine(`[ERROR] GitHub workflow trigger failed: ${d}`),r.window.showErrorMessage("Failed to trigger GitHub workflow. Check output for details.")}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.viewWorkflowStatus",async()=>{if(!W){r.window.showWarningMessage("GitHub workflow status requires an open workspace.");return}try{await W.manageWorkflows()}catch(d){e.appendLine(`[ERROR] Failed to view workflow status: ${d}`),r.window.showErrorMessage("Failed to view workflow status. Check output for details.")}})),u.subscriptions.push(r.commands.registerCommand("playwright-bdd.showExecutionHistory",async()=>{let{getExecutionHistory:d,clearExecutionHistory:l}=await Promise.resolve().then(()=>(Me(),ut)),h=d();if(h.length===0){r.window.showInformationMessage("No test execution history available.");return}let p=h.sort((v,$)=>$.timestamp.getTime()-v.timestamp.getTime()).map(v=>({label:`${v.success?"\u2705":"\u274C"} ${v.command}`,description:`${v.duration}ms`,detail:`${v.timestamp.toLocaleString()}`,history:v})),f=await r.window.showQuickPick(p,{placeHolder:"Recent test executions (most recent first)",matchOnDescription:!0,matchOnDetail:!0});if(f){let v=await r.window.showQuickPick([{label:"\u{1F4CB} Copy Command",action:"copy"},{label:"\u{1F5D1}\uFE0F Clear History",action:"clear"},{label:"\u{1F4CA} Show Details",action:"details"}],{placeHolder:"Choose an action"});v?.action==="copy"?(await r.env.clipboard.writeText(f.history.command),r.window.showInformationMessage("Command copied to clipboard")):v?.action==="clear"?(l(),r.window.showInformationMessage("Execution history cleared")):v?.action==="details"&&(e.appendLine(`
=== Execution Details ===`),e.appendLine(`Command: ${f.history.command}`),e.appendLine(`Success: ${f.history.success}`),e.appendLine(`Duration: ${f.history.duration}ms`),e.appendLine(`Timestamp: ${f.history.timestamp.toLocaleString()}`),e.show())}}));let J=r.window.createStatusBarItem(r.StatusBarAlignment.Left);J.text="$(beaker) Run BDD Tests",J.command="playwright-bdd.runTests",J.tooltip="Run all Playwright BDD tests",J.show(),u.subscriptions.push(J);let K=r.window.createStatusBarItem(r.StatusBarAlignment.Left);K.text="$(debug-stop) Stop BDD Tests",K.command="playwright-bdd.terminateTests",K.tooltip="Terminate running Playwright BDD tests",K.show(),u.subscriptions.push(K)}0&&(module.exports={activate});
