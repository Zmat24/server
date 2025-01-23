export function generateDocs(schemas: any): string {
    let html = `
        <html>
        <head>
            <title>API Documentation</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Inter', sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #f5f5f5;
                    color: #333;
                }
                .header {
                    background: #fff;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                }
                .token-section {
                    background: #fff;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                #authToken {
                    width: 100%;
                    padding: 8px;
                    margin: 10px 0;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .endpoint {
                    background: #fff;
                    border-radius: 10px;
                    margin: 15px 0;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .method {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 14px;
                }
                .method.post { background: #e3f2fd; color: #1565c0; }
                .method.get { background: #e8f5e9; color: #2e7d32; }
                .method.put { background: #fff3e0; color: #ef6c00; }
                .method.delete { background: #ffebee; color: #c62828; }
                .path {
                    color: #0056b3;
                    font-family: monospace;
                    font-size: 14px;
                    margin-left: 10px;
                }
                .field {
                    margin: 10px 0;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                }
                .test-section {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                }
                .test-input {
                    width: 100%;
                    padding: 8px;
                    margin: 5px 0;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .test-button {
                    background: #0056b3;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                }
                .test-button:hover {
                    background: #003d82;
                }
                .response-section {
                    margin-top: 10px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    display: none;
                }
                .schema-section {
                    background: #fff;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .auth-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .middleware-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .auth-badge {
                    background: #ffd700;
                    color: #333;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-left: 10px;
                }
                .endpoint-middleware {
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .endpoint-middleware ul, 
                .middleware-info ul {
                    margin: 5px 0;
                    padding-left: 20px;
                }
            </style>
            <script>
                let authToken = localStorage.getItem('authToken') || '';
                
                function setAuthToken() {
                    authToken = document.getElementById('authToken').value;
                    localStorage.setItem('authToken', authToken);
                }

                async function testEndpoint(schemaName, action, method, hasId = false) {
                    const baseUrl = window.location.origin;
                    const responseSection = document.getElementById(\`response-\${schemaName}-\${action}\`);
                    const inputData = document.getElementById(\`input-\${schemaName}-\${action}\`);
                    const idInput = hasId ? document.getElementById(\`id-\${schemaName}-\${action}\`).value : null;
                    
                    let url = \`\${baseUrl}/\${schemaName}/\${action}\`;
                    if (idInput) url += \`/\${idInput}\`;
                    
                    try {
                        const headers = {
                            'Content-Type': 'application/json'
                        };
                        if (authToken) {
                            headers['Authorization'] = \`Bearer \${authToken}\`;
                        }

                        const options = {
                            method: method,
                            headers: headers
                        };

                        if (method !== 'GET' && method !== 'DELETE' && inputData) {
                            try {
                                options.body = JSON.stringify(JSON.parse(inputData.value));
                            } catch (e) {
                                responseSection.textContent = 'Invalid JSON input';
                                responseSection.style.display = 'block';
                                return;
                            }
                        }

                        const response = await fetch(url, options);
                        const data = await response.json();
                        
                        responseSection.textContent = JSON.stringify(data, null, 2);
                        responseSection.style.display = 'block';
                    } catch (error) {
                        responseSection.textContent = 'Error: ' + error.message;
                        responseSection.style.display = 'block';
                    }
                }
            </script>
        </head>
        <body>
            <div class="header">
                <h1>API Documentation</h1>
                <p>Interactive API documentation for testing endpoints</p>
            </div>

            <div class="token-section">
                <h3>Authentication Token</h3>
                <input type="text" id="authToken" placeholder="Enter your JWT token" 
                       value="" onchange="setAuthToken()" />
                <p><small>Token will be saved in your browser for future requests</small></p>
            </div>
    `;

    for (const [schemaName, schema] of Object.entries(schemas)) {
        html += `
            <div class="schema-section">
                <h2>${schemaName}</h2>
                ${generateAuthInfo(schema)}
                ${generateMiddlewareInfo(schema)}
        `;
        const endpoints = (schema as any).endpoints || {};
        
        if (endpoints.create) {
            html += `
                <div class="endpoint">
                    <h3>
                        <span class="method post">POST</span>
                        <span class="path">/${schemaName}/create</span>
                        ${endpoints.create.auth ? '<span class="auth-badge">🔒 Requires Auth</span>' : ''}
                    </h3>
                    <p>Create a new ${schemaName}</p>
                    ${generateEndpointMiddleware(endpoints.create)}
                    <h4>Fields:</h4>
                    ${generateFieldsDoc((schema as any).fields)}
                    <div class="test-section">
                        <textarea id="input-${schemaName}-create" class="test-input" 
                                placeholder="Enter JSON data"></textarea>
                        <button class="test-button" 
                                onclick="testEndpoint('${schemaName}', 'create', 'POST')">
                            Test Create
                        </button>
                        <pre id="response-${schemaName}-create" class="response-section"></pre>
                    </div>
                </div>
            `;
        }

        if (endpoints.view) {
            html += `
                <div class="endpoint">
                    <h3>
                        <span class="method get">GET</span>
                        <span class="path">/${schemaName}/view/:id</span>
                    </h3>
                    <p>View a specific ${schemaName} by ID</p>
                    <div class="test-section">
                        <input type="number" id="id-${schemaName}-view" class="test-input" 
                               placeholder="Enter ID">
                        <button class="test-button" 
                                onclick="testEndpoint('${schemaName}', 'view', 'GET', true)">
                            Test View
                        </button>
                        <pre id="response-${schemaName}-view" class="response-section"></pre>
                    </div>
                </div>
            `;
        }

        if (endpoints.update) {
            html += `
                <div class="endpoint">
                    <h3>
                        <span class="method put">PUT</span>
                        <span class="path">/${schemaName}/update/:id</span>
                    </h3>
                    <p>Update a ${schemaName}</p>
                    <h4>Fields:</h4>
                    ${generateFieldsDoc((schema as any).fields)}
                    <div class="test-section">
                        <input type="number" id="id-${schemaName}-update" class="test-input" 
                               placeholder="Enter ID">
                        <textarea id="input-${schemaName}-update" class="test-input" 
                                placeholder="Enter JSON data"></textarea>
                        <button class="test-button" 
                                onclick="testEndpoint('${schemaName}', 'update', 'PUT', true)">
                            Test Update
                        </button>
                        <pre id="response-${schemaName}-update" class="response-section"></pre>
                    </div>
                </div>
            `;
        }

        if (endpoints.delete) {
            html += `
                <div class="endpoint">
                    <h3>
                        <span class="method delete">DELETE</span>
                        <span class="path">/${schemaName}/delete/:id</span>
                    </h3>
                    <p>Delete a ${schemaName}</p>
                    <div class="test-section">
                        <input type="number" id="id-${schemaName}-delete" class="test-input" 
                               placeholder="Enter ID">
                        <button class="test-button" 
                                onclick="testEndpoint('${schemaName}', 'delete', 'DELETE', true)">
                            Test Delete
                        </button>
                        <pre id="response-${schemaName}-delete" class="response-section"></pre>
                    </div>
                </div>
            `;
        }

        if (endpoints.find) {
            html += `
                <div class="endpoint">
                    <h3>
                        <span class="method get">GET</span>
                        <span class="path">/${schemaName}/find?field=&value=</span>
                    </h3>
                    <p>Find ${schemaName} by field value</p>
                    <div class="test-section">
                        <input type="text" id="field-${schemaName}-find" class="test-input" 
                               placeholder="Enter field name">
                        <input type="text" id="value-${schemaName}-find" class="test-input" 
                               placeholder="Enter value">
                        <button class="test-button" 
                                onclick="testEndpoint('${schemaName}', 'find', 'GET')">
                            Test Find
                        </button>
                        <pre id="response-${schemaName}-find" class="response-section"></pre>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
    }

    html += `
        </body>
        </html>
    `;

    return html;
}

function generateFieldsDoc(fields: any): string {
    if (!fields) return '';
    
    let html = '<div class="fields">';
    for (const [fieldName, field] of Object.entries(fields)) {
        const fieldInfo = field as any;
        html += `
            <div class="field">
                <strong>${fieldName}</strong>: ${fieldInfo.type}
                ${fieldInfo.required ? ' <span style="color: #c62828">(Required)</span>' : ''}
                ${fieldInfo.description ? `<br><small>${fieldInfo.description}</small>` : ''}
                ${generateValidationRules(fieldInfo.validation)}
            </div>
        `;
    }
    html += '</div>';
    return html;
}

function generateValidationRules(validation: any): string {
    if (!validation) return '';
    
    let rules = '<div class="validation-rules" style="margin-top: 8px; font-size: 14px;">';
    rules += '<strong style="color: #666;">Validation Rules:</strong><ul style="margin: 5px 0; padding-left: 20px;">';
    
    const validationData = validation.split('|');
    for (const [rule, value] of Object.entries(validationData)) {
        let ruleText = '';
        switch(rule) {
            case 'min':
                ruleText = `Minimum value: ${value}`;
                break;
            case 'max':
                ruleText = `Maximum value: ${value}`;
                break;
            case 'required':
                ruleText = `Must match pattern: ${value}`;
                break;
            default:
                ruleText = `${rule}: ${value}`;
        }
        rules += `<li>${ruleText}</li>`;
    }
    
    rules += '</ul></div>';
    return rules;
}

function generateAuthInfo(schema: any): string {
    if (!schema.auth) return '';
    
    return `
        <div class="auth-info">
            <h3>Authentication</h3>
            <p>This schema requires authentication for protected endpoints</p>
            ${schema.auth.roles ? `
                <p><strong>Required Roles:</strong> ${schema.auth.roles.join(', ')}</p>
            ` : ''}
        </div>
    `;
}

function generateMiddlewareInfo(schema: any): string {
    if (!schema.middleware || schema.middleware.length === 0) return '';
    
    return `
        <div class="middleware-info">
            <h3>Global Middleware</h3>
            <ul>
                ${schema.middleware.map((m: string) => `<li>${m}</li>`).join('')}
            </ul>
        </div>
    `;
}

function generateEndpointMiddleware(endpoint: any): string {
    if (!endpoint.middleware || endpoint.middleware.length === 0) return '';
    
    return `
        <div class="endpoint-middleware">
            <h4>Endpoint Middleware:</h4>
            <ul>
                ${endpoint.middleware.map((m: string) => `<li>${m}</li>`).join('')}
            </ul>
        </div>
    `;
} 