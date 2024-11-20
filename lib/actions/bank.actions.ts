"use server";

import {
  ACHClass,
  CountryCode,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";


import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";
import { plaidClient } from "../plaid";

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });

    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        // get each account info from plaid
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];

        // get institution info from plaid
        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });

        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
          shareableId: bank.shareableId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    const bank = await getBank({ documentId: appwriteItemId });
    if (!bank) {
      throw new Error("Bank not found");
    }

    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });

    const accountData = accountsResponse.data.accounts?.[0];
    if (!accountData) {
      throw new Error("No account data found");
    }

    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });

    const transferTransactions = transferTransactionsData?.documents?.map(
      (transferData: Transaction) => ({
        id: transferData.$id,
        name: transferData.name!,
        amount: transferData.amount!,
        date: transferData.$createdAt,
        paymentChannel: transferData.channel,
        category: transferData.category,
        type: transferData.senderBankId === bank.$id ? "debit" : "credit",
      })
    ) || [];

    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    let plaidTransactions = [];
    try {
      plaidTransactions = await getTransactions({
        accessToken: bank.accessToken,
      }) || [];
    } catch (error) {
      plaidTransactions = [];
    }

    const allTransactions = [...plaidTransactions, ...transferTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available!,
      currentBalance: accountData.balances.current!,
      institutionId: institution.institution_id,
      name: accountData.name,
      officialName: accountData.official_name,
      mask: accountData.mask!,
      type: accountData.type as string,
      subtype: accountData.subtype! as string,
      appwriteItemId: bank.$id,
    };

    return parseStringify({ data: account, transactions: allTransactions });
  } catch (error) {
    throw error;
  }
};



// Get bank info
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const institution = institutionResponse.data.institution;

    return parseStringify(institution);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get transactions
export const getTransactions = async ({ accessToken }: getTransactionsProps) => {
  let hasMore = true;
  let allTransactions: any[] = [];
  let cursor: string | undefined = undefined;

  try {
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor
      });

      const data = response.data;

      const newTransactions = data.added.map((transaction) => ({
        id: transaction.transaction_id,
        name: transaction.name,
        paymentChannel: transaction.payment_channel,
        type: transaction.payment_channel,
        accountId: transaction.account_id,
        amount: transaction.amount,
        pending: transaction.pending,
        category: transaction.category ? transaction.category[0] : "",
        date: transaction.date,
        image: transaction.logo_url,
      }));

      allTransactions = [...allTransactions, ...newTransactions];

      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    return parseStringify(allTransactions);
  } catch (error) {
    throw error;
  }
};

// Create Transfer
export const createTransfer = async () => {
  const transferAuthRequest: TransferAuthorizationCreateRequest = {
    access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
    account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
    funding_account_id: "442d857f-fe69-4de2-a550-0c19dc4af467",
    type: "credit" as TransferType,
    network: "ach" as TransferNetwork,
    amount: "10.00",
    ach_class: "ppd" as ACHClass,
    user: {
      legal_name: "Anne Charleston",
    },
  };
  try {
    const transferAuthResponse =
      await plaidClient.transferAuthorizationCreate(transferAuthRequest);
    const authorizationId = transferAuthResponse.data.authorization.id;

    const transferCreateRequest: TransferCreateRequest = {
      access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
      account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
      description: "payment",
      authorization_id: authorizationId,
    };

    const responseCreateResponse = await plaidClient.transferCreate(
      transferCreateRequest
    );

    const transfer = responseCreateResponse.data.transfer;
    return parseStringify(transfer);
  } catch (error) {
    console.error(
      "An error occurred while creating transfer authorization:",
      error
    );
  }
};