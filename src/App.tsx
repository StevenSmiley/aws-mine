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
  FormField,
  Header,
  HelpPanel,
  Input,
  Modal,
  SideNavigation,
  SpaceBetween,
  Table,
  TopNavigation,
} from '@cloudscape-design/components';


const client = generateClient<Schema>();

function App() {
  const [mines, setMines] = useState<Array<Schema["Mine"]["type"]>>([]);
  const [selectedItems, setSelectedItems] = useState<Array<Schema["Mine"]["type"]>>([]);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    client.models.Mine.observeQuery().subscribe({
      next: (data) => setMines([...data.items]),
    });
  }, []);

  async function createMine(description: string) {
    const { data, errors } = await client.queries.GenerateMine({});
    console.log(data, errors);
    if (data?.accessKeyId) {
      client.models.Mine.create({
        username: data.username,
        description: description,
        accessKeyId: data.accessKeyId,
        secretAccessKey: data.secretAccessKey,
      });
    }
    // TODO: Show errors if there are any
  }

  async function deleteMine(id: string, username: string, accessKeyId: string) {
    const { data, errors } = await client.queries.DisarmMine({ username: username, accessKeyId: accessKeyId });
    console.log(data, errors);
    if (data?.statusCode == 200) {
      client.models.Mine.delete({ id });
    }
    // TODO: Show errors if there are any
  }

  function confirmDelete() {
    selectedItems.forEach(item => deleteMine(item.id, item.username!, item.accessKeyId!));
    setSelectedItems([]);
    setIsDeleteModalVisible(false);
  }

  return (
    <Authenticator hideSignUp >
      {({ signOut, user }) => (
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
                  text: user?.signInDetails?.loginId,
                  iconName: 'user-profile',
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
            navigationOpen={navigationOpen}
            onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
            onToolsChange={({ detail }) => setToolsOpen(detail.open)}
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
            toolsOpen={toolsOpen}
            tools={<HelpPanel header={<h2>Help</h2>}>Help content</HelpPanel>}
            content={
              <ContentLayout>
                <Table
                  enableKeyboardNavigation={true}
                  columnDefinitions={[
                    {
                      id: "createdAt",
                      header: "Created at",
                      cell: (item) => item.createdAt,
                      sortingField: 'createdAt'
                    },
                    {
                      id: "description",
                      header: "Description",
                      cell: (item) => item.description || "-",
                    },
                    {
                      id: "accessKeyId",
                      header: "Key id",
                      cell: (item) => item.accessKeyId,
                      isRowHeader: true,
                    },
                    {
                      id: "secretAccessKey",
                      header: "Secret access key",
                      cell: (item) => item.secretAccessKey,
                    },
                    {
                      id: "username",
                      header: "Username",
                      cell: (item) => item.username,
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
                    }
                  }
                  items={mines.map(mine => ({
                    id: mine.id,
                    username: mine.username,
                    accessKeyId: mine.accessKeyId,
                    secretAccessKey: mine.secretAccessKey,
                    description: mine.description,
                    createdAt: mine.createdAt,
                    updatedAt: mine.updatedAt,
                  }))}
                  selectedItems={selectedItems}
                  onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
                  empty={<Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
                      <SpaceBetween size="m">
                        <b>No mines</b>
                        <Button onClick={() => setIsCreateModalVisible(true)}>Create mine</Button>
                      </SpaceBetween>
                  </Box>}
                  selectionType='multi'
                  variant="full-page"
                  stickyHeader={true}
                  resizableColumns={true}
                  loadingText='Loading mines'
                  trackBy={'id'}
                  header={
                    <Header variant="h1" actions={
                      <SpaceBetween size='xs' direction='horizontal'>
                        <Button 
                          onClick={() => selectedItems.length > 0 && setIsDeleteModalVisible(true)}
                          disabled={selectedItems.length === 0}
                        >
                          Delete
                        </Button>
                        <Button variant='primary' onClick={() => setIsCreateModalVisible(true)}>Create mine</Button>
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
          <Modal
            onDismiss={() => setIsCreateModalVisible(false)}
            visible={isCreateModalVisible}
            closeAriaLabel="Close"
            header="Create Mine"
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="link" onClick={() => setIsCreateModalVisible(false)}>Cancel</Button>
                  <Button variant="primary" onClick={() => {
                      createMine(description);
                      setIsCreateModalVisible(false);
                      setDescription('');
                    }}>
                    Create
                  </Button>
                </SpaceBetween>
              </Box>
            }
          >
            <FormField
              label="Description"
              description="Provide a description of where this mine will be placed. This will identify the potentially compromised asset."
            >
              <Input 
                value={description} 
                onChange={({ detail }) => setDescription(detail.value)}
              />
            </FormField>
          </Modal>
          <Modal
            onDismiss={() => setIsDeleteModalVisible(false)}
            visible={isDeleteModalVisible}
            closeAriaLabel="Close"
            header="Confirm Deletion"
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="link" onClick={() => setIsDeleteModalVisible(false)}>Cancel</Button>
                  <Button variant="primary" onClick={confirmDelete}>Delete</Button>
                </SpaceBetween>
              </Box>
            }
          >
            Are you sure you want to delete the selected mines? This action cannot be undone.
          </Modal>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
