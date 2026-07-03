// Get API base URL based on environment
export const getApiBaseUrl = (): string => {
  //const environment = process.env.ENVIRONMENT;
  const environment: string = "development";
  console.log(environment);

  if (environment === "production") {
    console.log("prod");
    return "https://visionaid-stats-ng.vercel.app";
  } else {
    console.log("dev");
    return "http://localhost:3000";
  }
};
