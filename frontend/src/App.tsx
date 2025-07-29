import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';

// Define the Todo interface to match the backend model
interface Todo {
  id: number;
  title: string;
  isComplete: boolean;
}

// The API and Hub URLs are now relative to the origin the app is served from.
// This removes the need for hardcoded IPs and complex CORS policies.
const API_BASE_URL = "/todos";
const HUB_URL = "/todohub";

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');

  // Fetch todos from the backend when the component mounts
  useEffect(() => {
    const fetchInitialTodos = async () => {
      try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTodos(data);
      } catch (error) {
        console.error('Failed to fetch todos:', error);
      }
    };

    // Get the initial list of todos via a standard HTTP request.
    fetchInitialTodos();

    // Then, set up the real-time SignalR connection.
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    // This is the key part for synchronization. The backend calls "ReceiveTodos" on all clients,
    // and this function receives the updated list and sets the state.
    connection.on('ReceiveTodos', (updatedTodos: Todo[]) => {
      setTodos(updatedTodos);
    });

    // Start the connection and log any errors.
    async function start() {
      try {
        await connection.start();
        console.log("SignalR Connected.");
      } catch (err) {
        console.error('SignalR Connection Error: ', err);
        setTimeout(start, 5000);
      }
    }

    start();

    // Return a cleanup function to close the connection when the component unmounts.
    return () => {
      connection.stop();
    };
  }, []);

  const addTodo = async () => {
    if (newTodo.trim() !== '') {
      try {
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: newTodo }),
        });

        if (response.ok) {
          setNewTodo('');
          // We don't need to manually update state here. The backend will broadcast the
          // new list via SignalR, and our listener above will handle the update.
        } else {
          console.error('Failed to add todo:', await response.text());
        }
      } catch (error) {
        console.error('Failed to add todo:', error);
      }
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // The state update is handled by the SignalR broadcast, so we don't
        // need to manually filter the list here.
      } else {
        console.error('Failed to delete todo:', await response.text());
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">Todo App</h1>

        <div className="flex items-center mb-4">
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Add new todo"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addTodo();
              }
            }}
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-2"
            type="button"
            onClick={addTodo}
          >
            Add
          </button>
        </div>

        <div>
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-700">{todo.title}</span>
              <button
                className="text-red-500 hover:text-red-700 focus:outline-none"
                onClick={() => deleteTodo(todo.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {todos.length === 0 && (
          <p className="text-gray-500 text-center mt-4">No todos yet!</p>
        )}

      </div>
      <footer className="text-center text-gray-600 text-sm">
        <p>
          Todo-app by Vegard Hovet.
          <br />
          The source code is available on <a href="https://github.com/wedgehov/todo-app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub</a> and deployed via a GitOps workflow managed in this <a href="https://github.com/wedgehov/gitops" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">repository</a>.
        </p>
        <p className="mt-2">
          <a href="https://grafana-dev.serit.dev/d/cecb77c6-2b95-4153-9895-ac4367831031/todo-app-dashboard?orgId=1" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            View live performance dashboard on Grafana
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
