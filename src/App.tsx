// import * as React from "react";
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import "@cloudscape-design/global-styles/index.css"
import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import {
  AppLayout,
  Badge,
  BreadcrumbGroup,
  Container,
  ContentLayout,
  // Flashbar,
  Header,
  HelpPanel,
  Link,
  SideNavigation,
  // SplitPanel,
  TopNavigation,
} from '@cloudscape-design/components';

const client = generateClient<Schema>();

function App() {
  const [mines, setMines] = useState<Array<Schema["Mine"]["type"]>>([]);

  useEffect(() => {
    client.models.Mine.observeQuery().subscribe({
      next: (data) => setMines([...data.items]),
    });
  }, []);

  function createMine() {
    client.models.Mine.create({ description: window.prompt("Mine description") });
  }

    
  function deleteMine(id: string) {
    client.models.Mine.delete({ id })
  }

  return (        
    <Authenticator>
      {({ signOut }) => (
        <div>
          <div id="h" style={{ position: 'sticky', top: 0, zIndex: 1002 }}>
          <TopNavigation
          identity={{
            href: '#',
            title: 'aws-mine',
          }}
          utilities={[
            {
              type: 'button',
              text: 'User Name',
              iconName: 'user-profile',
              // onClick allows user management
            },
            {
              type: 'button',
              text: 'Sign out',
              onClick: () => signOut!(),
            },
          ]}
        />
        </div>
        <AppLayout
            breadcrumbs={
              <BreadcrumbGroup
                items={[
                  { text: 'Home', href: '#' },
                  { text: 'Service', href: '#' },
                ]}
              />
            }
            navigationOpen={true}
            navigation={
              <SideNavigation
                items={[
                  { type: "link", text: "Mines", href: "#/mines" },
                  {
                    type: "link",
                    text: "Create a mine",
                    href: "#/create"
                  },
                  { type: "link", text: "Other", href: "#/other" },
                  { type: "divider" },
                  {
                    type: "link",
                    text: "Notifications",
                    href: "#/notifications",
                    info: <Badge color="red">1</Badge>
                  },
                  {
                    type: "link",
                    text: "Documentation",
                    href: "https://example.com",
                    external: true
                  }
                ]}
              />
            }
            // notifications={
            //   <Flashbar
            //     items={[
            //       {
            //         type: 'info',
            //         dismissible: true,
            //         content: 'This is an info flash message.',
            //         id: 'message_1',
            //       },
            //     ]}
            //   />
            // }
            toolsOpen={true}
            tools={<HelpPanel header={<h2>Help</h2>}>Help content</HelpPanel>}
            content={
              <ContentLayout
                header={
                  <Header variant="h1" info={<Link variant="info">Info</Link>}>
                    Mines
                  </Header>
                }
              >
                <Container
                  header={
                    <Header variant="h2" description="Table content">
                      Table of mines
                    </Header>
                  }
                >
                  // TODO: Populate a table
                  <button onClick={createMine}>+ new</button>
                  <ul>
                    {mines.map((mine) => (
                      <li           
                        onClick={() => deleteMine(mine.id)}
                        key={mine.id}>
                        {mine.description}
                        <br />
                        {mine.createdAt}
                      </li>
                    ))}
                  </ul>
                </Container>
              </ContentLayout>
            }
          />
        </div>
      )}
      </Authenticator>
  );
}

export default App;
