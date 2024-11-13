import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Ensure environment variables are loaded
if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    throw new Error("PLAID_CLIENT_ID or PLAID_SECRET is missing!");
}

const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});

export const plaidClient = new PlaidApi(configuration);
