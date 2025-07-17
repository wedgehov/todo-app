import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';

// Define the Todo interface to match the backend model
interface Todo {
  id: number;
  title: string;
  isComplete: boolean;
}

// Use the environment variable for the API URL, with a fallback for local development.
const API_URL = import.meta.env.VITE_REACT_APP_API_URL;

//const API_URL = "https://todo-app.10.1.8.174.nip.io:31003"
const HUB_URL = `${API_URL}/todohub`; // Derive the SignalR URL from the base API URL

console.log("VITE_REACT_APP_API_URL value:", import.meta.env.VITE_REACT_APP_API_URL);
console.log("API_URL value:", API_URL);

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');

  // Fetch todos from the backend when the component mounts
  useEffect(() => {
    const fetchInitialTodos = async () => {
      try {
        const response = await fetch(`${API_URL}/todos`);
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
        const response = await fetch(`${API_URL}/todos`, {
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
      const response = await fetch(`${API_URL}/todos/${id}`, {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded lg px-8 pt-6 pb-8 mb-4 w-full max-w-lg">
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
    </div>
  );
}

export default App;
