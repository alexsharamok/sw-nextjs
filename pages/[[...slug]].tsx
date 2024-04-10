import React from "react";
import { createConsoleLogger, getNextConfig, getNextPageProps, NextPageProps, PageComponent, Placeholder, UniformContextProvider } from "@uniformdev/next";
import { downloadSiteMap, parseUniformServerConfig } from "@uniformdev/common-server";
import { notFound } from 'next/navigation';


// Register React components here if you migrate from MVC to React
const componentsIndex: any = {};

// Root page handling all pages coming from Uniform Page Service API
const Page = function (props: NextPageProps) {
  return (
    <UniformContextProvider logger={createConsoleLogger()} componentMap={componentsIndex}>
      <PageComponent {...props}>
        {(renderingContext) => (
          <Placeholder placeholderKey="/" renderingContext={renderingContext} />
        )}
      </PageComponent>
    </UniformContextProvider>
  );
};

// Using Automatic Static Optimization
export async function getStaticPaths() {
  // await import is essential here because getStaticPaths only server-side 
  // and import must only happen server side (on client-side the code will blow up)
  const { getStaticPaths } = await import("@uniformdev/next-server");
  

  if (process.env.UNIFORM_BUILD_MODE !== 'ssr') {
    // If we are exporting the site directly or via a publish
    // specify all static paths and let nextjs handle 404
    const paths = await getStaticPaths();
    
    return {
      paths: paths,
      fallback: "blocking",
    };
  } else {
    // If we are running the site in dynamic preview then
    // handle all paths and render them on the fly    
    return {
      paths: [],
      fallback: "blocking",
    };
  }
}

export async function getStaticProps({ params }) {
  const { tryFindItemId, tryGetTimestamp } = await import('@uniformdev/common-server');
  const asPath = "/" + (params?.slug?.join("/") || "");
  const itemId = await tryFindItemId(asPath);
  const timestamp = await tryGetTimestamp(asPath);
  const props = await getNextPageProps({ asPath, itemId, timestamp });
  
  const logger = createConsoleLogger();
  let map: any = undefined;    
    const config = parseUniformServerConfig(process.env, logger);    
    try {      
      map = await downloadSiteMap(
          config,
          logger,
          {
              maxAttempts: 1,
          }
      );
  } catch {
      logger.warn('cannot download map');
  }
  if (map) {
    if (!Object.getOwnPropertyNames(map).includes(asPath)) {
      return {};
    } 
  }
  console.log(asPath);

  return { 
    props: props,
    revalidate: 60
   };
}

//PREVIEW MODE
// export async function getServerSideProps({ params }) {
//   const { tryFindItemId, tryGetTimestamp } = await import('@uniformdev/common-server');
//   const asPath = "/" + (params?.slug?.join("/") || "");
//   const itemId = await tryFindItemId(asPath);
//   const timestamp = await tryGetTimestamp(asPath);
//   const props = await getNextPageProps({ asPath, itemId, timestamp });
//   return { props: props };
// }

export default Page;
