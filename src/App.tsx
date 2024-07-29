// import * as React from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "@cloudscape-design/global-styles/index.css";
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
  CopyToClipboard,
  FormField,
  Header,
  HelpPanel,
  KeyValuePairs,
  Icon,
  Input,
  Modal,
  SideNavigation,
  SpaceBetween,
  Table,
  TopNavigation,
} from "@cloudscape-design/components";

const client = generateClient<Schema>();

function App() {
  const [mines, setMines] = useState<Array<Schema["Mine"]["type"]>>([]);
  const [selectedItems, setSelectedItems] = useState<
    Array<Schema["Mine"]["type"]>
  >([]);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [newMine, setNewMine] = useState<Schema["Mine"]["type"] | null>(null);

  useEffect(() => {
    client.models.Mine.observeQuery().subscribe({
      next: (data) => setMines([...data.items]),
    });
  }, []);

  async function createMine(description: string) {
    try {
      const { data, errors } = await client.queries.GenerateMine({});
      if (errors) {
        console.error("Error generating mine:", errors);
        return;
      }

      if (data?.accessKeyId) {
        const { data: createdMine, errors: createErrors } =
          await client.models.Mine.create({
            username: data.username,
            description: description,
            accessKeyId: data.accessKeyId,
            secretAccessKey: data.secretAccessKey,
            tripped: false,
            trippedAt: null,
          });

        if (createErrors) {
          console.error("Error creating mine:", createErrors);
          return;
        }

        setNewMine(createdMine);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  }

  async function deleteMine(username: string, accessKeyId: string) {
    const { data, errors } = await client.queries.DisarmMine({
      username: username,
      accessKeyId: accessKeyId,
    });
    console.log(data, errors);
    if (data?.statusCode == 200) {
      client.models.Mine.delete({ accessKeyId });
    }
    // TODO: Show errors if there are any
  }

  function confirmDelete() {
    selectedItems.forEach((item) =>
      deleteMine(item.accessKeyId, item.username!)
    );
    setSelectedItems([]);
    setIsDeleteModalVisible(false);
  }

  return (
    <Authenticator hideSignUp>
      {({ signOut, user }) => (
        <div>
          <TopNavigation
            identity={{
              href: "#",
              title: "aws-mine",
            }}
            utilities={[
              {
                type: "button",
                text: user?.signInDetails?.loginId,
                iconName: "user-profile",
              },
              {
                type: "button",
                text: "Sign out",
                onClick: () => signOut!(),
              },
            ]}
          />
          <AppLayout
            breadcrumbs={
              <BreadcrumbGroup
                items={[
                  { text: "Home", href: "#" },
                  { text: "Mines", href: "#" },
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
                  {
                    type: "link",
                    text: "Integrations",
                    href: "#/integrations",
                  },
                  { type: "divider" },
                  {
                    type: "link",
                    text: "Notifications",
                    href: "#/notifications",
                    info: <Badge color="red">1</Badge>,
                  },
                  {
                    type: "link",
                    text: "Documentation",
                    href: "https://github.com/StevenSmiley/aws-mine",
                    external: true,
                  },
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
            tools={
              <HelpPanel header={<h2>Help</h2>}>
                Copy and paste the pair of AWS access keys anywhere you want to
                tempt bad guys and detect that someone tried to use them.
                <br />
                <br />
                These are normally placed into an AWS credentials file at
                ~/.aws/credentials on macOS and Linux, or
                %USERPROFILE%.aws\credentials on Windows.
                <br />
                <br />
                Make sure to provide a helpful description of where they will be
                placed. If you receive notification that they have been used,
                you will want to know where they were placed originally so you
                can determine if that asset has been compromised.
              </HelpPanel>
            }
            content={
              <ContentLayout>
                <Table
                  enableKeyboardNavigation={true}
                  columnDefinitions={[
                    {
                      id: "createdAt",
                      header: "Created at",
                      cell: (item) => item.createdAt,
                      sortingField: "createdAt",
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
                      id: "tripped",
                      header: "Tripped?",
                      cell: (item) => (
                        <Icon
                          name={
                            item.tripped ? "status-warning" : "status-pending"
                          }
                          variant={item.tripped ? "error" : "normal"}
                        />
                      ),
                    },
                    {
                      id: "trippedAt",
                      header: "Tripped At",
                      cell: (item) => item.trippedAt || "",
                    },
                    {
                      id: "username",
                      header: "Username",
                      cell: (item) => item.username,
                    },
                  ]}
                  sortingColumn={{
                    sortingField: "createdAt",
                  }}
                  sortingDescending
                  stickyColumns={{
                    first: 1,
                  }}
                  items={mines.map((mine) => ({
                    username: mine.username,
                    accessKeyId: mine.accessKeyId,
                    secretAccessKey: mine.secretAccessKey,
                    description: mine.description,
                    createdAt: mine.createdAt,
                    updatedAt: mine.updatedAt,
                    tripped: mine.tripped,
                    trippedAt: mine.trippedAt,
                  }))}
                  selectedItems={selectedItems}
                  onSelectionChange={({ detail }) =>
                    setSelectedItems(detail.selectedItems)
                  }
                  empty={
                    <Box
                      margin={{ vertical: "xs" }}
                      textAlign="center"
                      color="inherit"
                    >
                      <SpaceBetween size="m">
                        <b>No mines</b>
                        <Button onClick={() => setIsCreateModalVisible(true)}>
                          Create mine
                        </Button>
                      </SpaceBetween>
                    </Box>
                  }
                  selectionType="multi"
                  variant="full-page"
                  stickyHeader={true}
                  resizableColumns={true}
                  loadingText="Loading mines"
                  trackBy={"id"}
                  header={
                    <Header
                      variant="h1"
                      actions={
                        <SpaceBetween size="xs" direction="horizontal">
                          <Button
                            onClick={() =>
                              selectedItems.length > 0 &&
                              setIsDeleteModalVisible(true)
                            }
                            disabled={selectedItems.length === 0}
                          >
                            Delete
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => setIsCreateModalVisible(true)}
                          >
                            Create mine
                          </Button>
                        </SpaceBetween>
                      }
                    >
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
                  <Button
                    variant="link"
                    onClick={() => setIsCreateModalVisible(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (description.trim() === "") {
                        setDescriptionError("Description cannot be empty");
                      } else {
                        createMine(description);
                        setIsCreateModalVisible(false);
                        setDescription("");
                        setDescriptionError("");
                      }
                    }}
                  >
                    Create
                  </Button>
                </SpaceBetween>
              </Box>
            }
          >
            <FormField
              label="Description"
              description="Provide a description of where this mine will be placed. This will identify the potentially compromised asset."
              errorText={descriptionError}
            >
              <Input
                value={description}
                onChange={({ detail }) => {
                  setDescription(detail.value);
                  if (detail.value.trim() !== "") {
                    setDescriptionError("");
                  }
                }}
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
                  <Button
                    variant="link"
                    onClick={() => setIsDeleteModalVisible(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={confirmDelete}>
                    Delete
                  </Button>
                </SpaceBetween>
              </Box>
            }
          >
            Are you sure you want to delete the selected mines? This action
            cannot be undone.
          </Modal>
          <Modal
            onDismiss={() => setNewMine(null)}
            visible={newMine !== null}
            closeAriaLabel="Close"
            header="Mine created"
            footer={
              <Box float="right">
                <Button variant="primary" onClick={() => setNewMine(null)}>
                  Close
                </Button>
              </Box>
            }
          >
            {newMine && (
              <KeyValuePairs
                items={[
                  { label: "Description", value: newMine.description },
                  {
                    label: "AWS access key id",
                    value: (
                      <CopyToClipboard
                        copyButtonAriaLabel="Copy"
                        copyErrorText="Access key id failed to copy"
                        copySuccessText="Access key id copied"
                        textToCopy={newMine.accessKeyId!}
                        variant="inline"
                      />
                    ),
                  },
                  {
                    label: "AWS secret access key",
                    value: (
                      <CopyToClipboard
                        copyButtonAriaLabel="Copy"
                        copyErrorText="Secret access key failed to copy"
                        copySuccessText="Secret access key copied"
                        textToCopy={newMine.secretAccessKey!}
                        variant="inline"
                      />
                    ),
                  },
                  {
                    label: "Profile",
                    value: (
                      <div>
                        <Box variant="code">
                          [devops-admin]
                          <br />
                          aws_access_key_id={newMine.accessKeyId}
                          <br />
                          aws_secret_access_key={newMine.secretAccessKey}
                        </Box>
                        <br />
                        <CopyToClipboard
                          copyButtonAriaLabel="Copy"
                          copyErrorText="Profile failed to copy"
                          copySuccessText="Profile copied"
                          textToCopy={`[devops-admin]
aws_access_key_id = ${newMine.accessKeyId}
aws_secret_access_key = ${newMine.secretAccessKey}`}
                          variant="button"
                          copyButtonText="Copy profile"
                        />
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </Modal>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
