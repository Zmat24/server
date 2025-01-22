
# Zmat24 Fake REST Api

a lightweight lib for fake REST Api & full of features

## Features

- Zero Config
- Zero dependency
- Schema base
- Auth
- Middleware
- Database support
- Crud ready
- Support freamwork 
- use Bun


## Install & Setup
soon
<!-- Install from NPM

```bash
  npm i
```

Go to the project directory

```bash
  cd my-project
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run start
``` -->


## Usage/Examples

```javascript
// schema.config.js
const config = {
    storage: "json", // or database
    schemas: {
        user: {
            // controll endpoints
            endpoints: {
                create: true,
                view: true,
                update: true,
                delete: false,
            },
            // controll auth
            auth: {
                type: "jwt"
            },
            // controll field
            fields: {
                name: {
                    // validation
                    validation: "required|min:3"
                },
                email: {
                    validation: "required|max:50"
                },
                password: {
                    validation: "required|min:8",
                    // hash or scurty
                    hash: true,
                }
            }
        },
    },
};

export default config;
```


## Authors

- [@matinsoleymni](https://www.github.com/matinsoleymni)


## Support

For support, email matinsoleymni@gmail.com or join our Telegram Channel.

