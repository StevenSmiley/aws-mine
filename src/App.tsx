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
  Box,
  BreadcrumbGroup,
  Button,
  ContentLayout,
  // Flashbar,
  Header,
  HelpPanel,
  Link,
  SideNavigation,
  SpaceBetween,
  // SplitPanel,
  Table,
  TopNavigation,
} from '@cloudscape-design/components';

const client = generateClient<Schema>();

function App() {
  const [mines, setMines] = useState<Array<Schema["Mine"]["type"]>>([]);
  const [selectedItems, setSelectedItems] = useState<Array<Schema["Mine"]["type"]>>([]);
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
              // TODO: onClick allows user management
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
                  { text: 'Mines', href: '#' },
                ]}
              />
            }
            navigationOpen={true}
            navigation={
              <SideNavigation
                items={[
                  { type: "link", text: "Mines", href: "#/mines" },
                  { type: "link", text: "Integrations", href: "#/integrations" },
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
                    href: "https://github.com/StevenSmiley/aws-mine",
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
              <ContentLayout>
                <Table
                  enableKeyboardNavigation={true}
                  columnDefinitions={[
                    {
                      id: "id",
                      header: "Id",
                      cell: (item) => item.id,
                      isRowHeader: true,
                    },
                    {
                      id: "description",
                      header: "Description",
                      cell: (item) => item.description || "-",
                    },
                    {
                      id: "createdAt",
                      header: "Created at",
                      cell: (item) => item.createdAt,
                      sortingField: 'createdAt'
                    },
                  ]}
                  sortingColumn={
                    {
                      sortingField: "createdAt",
                    }
                  }
                  sortingDescending
                  stickyColumns={
                    {
                      first: 1,
                      last: 1,
                    }
                  }
                  items={mines.map(mine => ({
                    id: mine.id,
                    description: mine.description,
                    createdAt: mine.createdAt,
                    updatedAt: mine.updatedAt,
                  }))}
                  selectedItems={selectedItems}
                  onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
                  empty={<Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
                    <SpaceBetween size="m">
                      <b>No mines</b>
                      <Button href='#/create' onClick={createMine}>Create mine</Button>
                    </SpaceBetween>
                  </Box>}
                  selectionType='multi'
                  variant="full-page"
                  stickyHeader={true}
                  resizableColumns={true}
                  loadingText='Loading mines'
                  header={
                    <Header variant="h1" info={<Link variant="info">Info</Link>} actions={
                      <SpaceBetween size='xs' direction='horizontal'>
                        <Button onClick={() => selectedItems.forEach(item => deleteMine(item.id))}>Delete</Button>
                        <Button variant='primary' href='#/create' onClick={createMine}>Create mine</Button>
                      </SpaceBetween>
                    }>
                      Mines
                    </Header>
                  }
                  // pagination={<Pagination {...paginationProps} />}
                />
              </ContentLayout>
            }
          />
        </div>
      )}
      </Authenticator>
  );
}

export default App;
