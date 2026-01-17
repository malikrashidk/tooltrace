module.exports = {
    apps: [{
        name: "tooltrace",
        script: "./dist/index.js",
        node_args: "--import ./dist/instrument.js",
        env: {
            NODE_ENV: "production",
            PORT: 5000
        }
    }]
}
