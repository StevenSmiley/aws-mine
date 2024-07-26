import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

function App() {
  const [mines, setMines] = useState<Array<Schema["Mine"]["type"]>>([]);

  useEffect(() => {
    client.models.Mine.observeQuery().subscribe({
      next: (data) => setMines([...data.items]),
    });
  }, []);

  function createMine() {
    client.models.Mine.create({ content: window.prompt("Mine content") });
  }

    
  function deleteMine(id: string) {
    client.models.Mine.delete({ id })
  }

  return (
        
    <Authenticator>
      {({ signOut }) => (
        <main>
          <h1>My mines</h1>
          <button onClick={createMine}>+ new</button>
          <ul>
            {mines.map((mine) => (
              <li           
                onClick={() => deleteMine(mine.id)}
                key={mine.id}>
                {mine.content}
              </li>
            ))}
          </ul>
          <div>
            🥳 App successfully hosted. Try creating a new mine.
            <br />
            <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
              Review next step of this tutorial.
            </a>
          </div>
          <button onClick={signOut}>Sign out</button>
        </main>
      )}
      </Authenticator>
  );
}

export default App;
