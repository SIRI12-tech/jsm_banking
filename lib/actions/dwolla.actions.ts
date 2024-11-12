"use server";

import { Client } from "dwolla-v2";

const getEnvironment = (): "production" | "sandbox" => {
  const environment = process.env.DWOLLA_ENV as string;

  switch (environment) {
    case "sandbox":
      return "sandbox";
    case "production":
      return "production";
    default:
      throw new Error(
        "Dwolla environment should either be set to `sandbox` or `production`"
      );
  }
};

const dwollaClient = new Client({
  environment: getEnvironment(),
  key: process.env.DWOLLA_KEY as string,
  secret: process.env.DWOLLA_SECRET as string,
});

export const createDwollaCustomer = async (newCustomer: NewDwollaCustomerParams) => {
  try {
    // Format SSN by removing any hyphens
    if (newCustomer.ssn) {
      // First normalize the SSN by removing any existing hyphens
      const cleanSSN = newCustomer.ssn.replace(/-/g, '');
      
      // Validate that it's 9 digits
      if (!/^\d{9}$/.test(cleanSSN)) {
        throw new Error("SSN must be 9 digits");
      }

      // Set the cleaned SSN
      newCustomer.ssn = cleanSSN;
    }

    // Format postal code by removing any spaces or hyphens
    if (newCustomer.postalCode) {
      const cleanPostalCode = newCustomer.postalCode.replace(/[\s-]/g, '');
      
      // Validate it's 5 or 9 digits
      if (!/^\d{5}(\d{4})?$/.test(cleanPostalCode)) {
        throw new Error("Postal code must be 5 digits or 9 digits");
      }

      newCustomer.postalCode = cleanPostalCode;
    }

    const response = await dwollaClient.post("customers", newCustomer);
    const location = response.headers.get("location");
    
    if (!location) {
      console.error("No location header in Dwolla response");
      throw new Error("Failed to create Dwolla customer: No location returned");
    }
    
    return location;
  } catch (err: any) {
    // Log the full error for debugging
    console.error("Full Dwolla error:", JSON.stringify(err, null, 2));

    // Check if it's a validation error
    if (err.body && typeof err.body === 'string') {
      try {
        const parsedError = JSON.parse(err.body);
        if (parsedError._embedded?.errors) {
          const errorMessages = parsedError._embedded.errors
            .map((e: any) => `${e.path}: ${e.message}`)
            .join(', ');
          throw new Error(`Validation failed: ${errorMessages}`);
        }
      } catch (parseErr) {
        // If JSON parsing fails, use the original error
        console.error("Error parsing Dwolla response:", parseErr);
      }
    }

    // If we got here, it's not a validation error or we couldn't parse it
    throw err;
  }
};

// Create a Dwolla Funding Source using a Plaid Processor Token
export const createFundingSource = async (
  options: CreateFundingSourceOptions
) => {
  try {
    return await dwollaClient
      .post(`customers/${options.customerId}/funding-sources`, {
        name: options.fundingSourceName,
        plaidToken: options.plaidToken,
      })
      .then((res) => res.headers.get("location"));
  } catch (err) {
    console.error("Creating a Funding Source Failed: ", err);
  }
};

export const createOnDemandAuthorization = async () => {
  try {
    const onDemandAuthorization = await dwollaClient.post(
      "on-demand-authorizations"
    );
    const authLink = onDemandAuthorization.body._links;
    return authLink;
  } catch (err) {
    console.error("Creating an On Demand Authorization Failed: ", err);
  }
};

// export const createDwollaCustomer = async (
//   newCustomer: NewDwollaCustomerParams
// ) => {
//   try {
//     return await dwollaClient
//       .post("customers", newCustomer)
//       .then((res) => res.headers.get("location"));
//   } catch (err) {
//     console.error("Creating a Dwolla Customer Failed: ", err);
//   }
// };

export const createTransfer = async ({
  sourceFundingSourceUrl,
  destinationFundingSourceUrl,
  amount,
}: TransferParams) => {
  try {
    const requestBody = {
      _links: {
        source: {
          href: sourceFundingSourceUrl,
        },
        destination: {
          href: destinationFundingSourceUrl,
        },
      },
      amount: {
        currency: "USD",
        value: amount,
      },
    };
    return await dwollaClient
      .post("transfers", requestBody)
      .then((res) => res.headers.get("location"));
  } catch (err) {
    console.error("Transfer fund failed: ", err);
  }
};

export const addFundingSource = async ({
  dwollaCustomerId,
  processorToken,
  bankName,
}: AddFundingSourceParams) => {
  try {
    // create dwolla auth link
    const dwollaAuthLinks = await createOnDemandAuthorization();

    // add funding source to the dwolla customer & get the funding source url
    const fundingSourceOptions = {
      customerId: dwollaCustomerId,
      fundingSourceName: bankName,
      plaidToken: processorToken,
      _links: dwollaAuthLinks,
    };
    return await createFundingSource(fundingSourceOptions);
  } catch (err) {
    console.error("Transfer fund failed: ", err);
  }
};