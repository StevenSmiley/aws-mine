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
    client.models.Mine.create({ description: window.prompt("Mine description") });
  }

    
  function deleteMine(id: string) {
    client.models.Mine.delete({ id })
  }

  return (
        
    <Authenticator>
      {({ signOut }) => (
        <main>
          <h1>AWS mines</h1>
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
          <div>
            <br />
            <button onClick={signOut}>Sign out</button>
          </div>
        </main>
      )}
      </Authenticator>
  );
}

export default App;
