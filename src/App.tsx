import * as React from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "@cloudscape-design/global-styles/index.css";
import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import {
  AppLayout,
  Box,
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
  SpaceBetween,
  Pagination,
  Table,
  TopNavigation,
  Link,
} from "@cloudscape-design/components";

const client = generateClient<Schema>();

function App() {
  const [mines, setMines] = useState<Array<Schema["Mine"]["type"]>>([]);
  const [selectedItems, setSelectedItems] = useState<
    Array<Schema["Mine"]["type"]>
  >([]);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [newMine, setNewMine] = useState<Schema["Mine"]["type"] | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = React.useState(1);

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
  }

  function confirmDelete() {
    selectedItems.forEach((item) =>
      deleteMine(item.username!, item.accessKeyId)
    );
    setSelectedItems([]);
    setIsDeleteModalVisible(false);
  }

  async function resetMine(accessKeyId: string) {
    try {
      const { data, errors } = await client.models.Mine.update({
        accessKeyId: accessKeyId,
        tripped: false,
        trippedAt: null,
      });
      if (errors) {
        console.error("Error resetting mine:", errors);
      }
      console.log("Reset mine with access key id:", data?.accessKeyId);
    } catch (error) {
      console.error("Unexpected error resetting mine:", error);
    }
  }

  function resetSelectedMines() {
    selectedItems.forEach((item) => resetMine(item.accessKeyId));
    setSelectedItems([]);
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
            onToolsChange={({ detail }) => setToolsOpen(detail.open)}
            toolsOpen={toolsOpen}
            navigationHide
            tools={
              <HelpPanel header={<h2>Help</h2>}>
                Copy and paste the pair of AWS access keys anywhere you want to
                tempt bad guys and detect if someone tries to use them.
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
                <br />
                <br />
                <Link href="https://github.com/StevenSmiley/aws-mine" external>
                  Documentation
                </Link>
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
                      id: "trippedStatus",
                      header: "Tripped status",
                      cell: (item) => (
                        <div>
                          <Icon
                            name={
                              item.tripped ? "status-warning" : "status-pending"
                            }
                            variant={item.tripped ? "error" : "normal"}
                          />
                          &nbsp;
                          {item.tripped && item.trippedAt
                            ? item.trippedAt
                            : "Not tripped"}
                        </div>
                      ),
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
                      cell: (item) => (
                        <CopyToClipboard
                          copyButtonAriaLabel="Copy secret access key"
                          copyErrorText="Secret access key failed to copy"
                          copySuccessText="Secret access key copied"
                          textToCopy={item.secretAccessKey!}
                          variant="icon"
                        />
                      ),
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
                  pagination={
                    <Pagination
                      currentPageIndex={currentPageIndex}
                      onChange={({ detail }) =>
                        setCurrentPageIndex(detail.currentPageIndex)
                      }
                      pagesCount={Math.ceil(mines.length / 10)}
                    />
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
                  resizableColumns={false}
                  loadingText="Loading mines"
                  trackBy={"accessKeyId"}
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
                            onClick={resetSelectedMines}
                            disabled={
                              !selectedItems.some(
                                (item) => item.tripped === true
                              )
                            }
                          >
                            Reset
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
                      Mines ({mines.length})
                    </Header>
                  }
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
