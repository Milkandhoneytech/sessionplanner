import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { useState, FormEvent } from "react";
import { toast, Toaster } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-2 flex justify-between items-center border-b">
        <h2 className="text-lg font-semibold accent-text">Session Planner</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4 overflow-auto">
        <Authenticated>
          <Dashboard />
        </Authenticated>
        <Unauthenticated>
          <div className="max-w-md mx-auto">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold accent-text mb-2">Session Planner</h1>
              <p className="text-sm text-slate-600">Sign in to get started</p>
            </div>
            <SignInForm />
          </div>
        </Unauthenticated>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}

function Dashboard() {
  const [selectedSession, setSelectedSession] = useState<Id<"sessions"> | null>(null);
  const [search, setSearch] = useState("");
  
  const sessions = useQuery(api.sessions.list, { search }) || [];
  const createSession = useMutation(api.sessions.create);

  const handleCreateSession = async () => {
    const title = prompt("Enter session title:");
    if (title) {
      await createSession({ title });
      toast.success("Session created!");
    }
  };

  return (
    <div className="flex gap-4 h-full">
      <div className="w-64 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <input
            type="search"
            placeholder="Search sessions..."
            className="p-1.5 text-sm border rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={handleCreateSession}
            className="bg-blue-500 text-white p-1.5 text-sm rounded hover:bg-blue-600"
          >
            Create New Session
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-auto">
          {sessions.map((session) => (
            <div
              key={session._id}
              onClick={() => setSelectedSession(session._id)}
              className={`p-3 border rounded cursor-pointer hover:border-blue-500 ${
                selectedSession === session._id ? "border-blue-500 bg-blue-50" : ""
              }`}
            >
              <h3 className="font-semibold text-sm">{session.title}</h3>
              <p className="text-xs text-gray-500">
                Total time: {session.totalTime} minutes
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {selectedSession && <SessionDetail sessionId={selectedSession} />}
    </div>
  );
}

interface SessionDetailProps {
  sessionId: Id<"sessions">;
}

function SessionDetail({ sessionId }: SessionDetailProps) {
  const elements = useQuery(api.sessions.getElements, { sessionId }) || [];
  const addElement = useMutation(api.sessions.addElement);
  const updateElement = useMutation(api.sessions.updateElement);
  const reorderElement = useMutation(api.sessions.reorderElement);
  
  const [editingElement, setEditingElement] = useState<Id<"sessionElements"> | null>(null);

  const handleAddElement = async () => {
    await addElement({
      sessionId,
      title: "New Element",
      time: 0,
      notes: "",
    });
    toast.success("Element added!");
  };

  const handleSaveElement = async (element: {
    _id: Id<"sessionElements">;
    title: string;
    time: number;
    notes: string;
  }) => {
    await updateElement({
      elementId: element._id,
      title: element.title,
      time: element.time,
      notes: element.notes,
    });
    setEditingElement(null);
    toast.success("Element saved!");
  };

  const handleMoveElement = async (elementId: Id<"sessionElements">, direction: 'up' | 'down') => {
    const element = elements.find(e => e._id === elementId);
    if (!element) return;
    
    const newOrder = direction === 'up' ? element.order - 1 : element.order + 1;
    if (newOrder >= 0 && newOrder < elements.length) {
      await reorderElement({ elementId, newOrder });
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Session Elements</h2>
        <button
          onClick={handleAddElement}
          className="bg-green-500 text-white px-3 py-1.5 text-sm rounded hover:bg-green-600"
        >
          Add Element
        </button>
      </div>
      
      <div className="space-y-3">
        {elements.sort((a, b) => a.order - b.order).map((element) => (
          <div key={element._id} className="border rounded p-3">
            {editingElement === element._id ? (
              <ElementEditor
                element={element}
                onSave={handleSaveElement}
                onCancel={() => setEditingElement(null)}
              />
            ) : (
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm">{element.title}</h3>
                    <p className="text-xs text-gray-500">{element.time} minutes</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoveElement(element._id, 'up')}
                      disabled={element.order === 0}
                      className="text-gray-500 hover:text-gray-700 disabled:opacity-50 px-1"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveElement(element._id, 'down')}
                      disabled={element.order === elements.length - 1}
                      className="text-gray-500 hover:text-gray-700 disabled:opacity-50 px-1"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => setEditingElement(element._id)}
                      className="text-blue-500 hover:text-blue-700 text-sm px-1"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {element.notes && (
                  <p className="mt-2 text-xs text-gray-600">{element.notes}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ElementEditorProps {
  element: {
    _id: Id<"sessionElements">;
    title: string;
    time: number;
    notes: string;
  };
  onSave: (element: {
    _id: Id<"sessionElements">;
    title: string;
    time: number;
    notes: string;
  }) => void;
  onCancel: () => void;
}

function ElementEditor({ element, onSave, onCancel }: ElementEditorProps) {
  const [title, setTitle] = useState(element.title);
  const [time, setTime] = useState(element.time);
  const [notes, setNotes] = useState(element.notes);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ ...element, title, time, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full border rounded-md shadow-sm p-1.5 text-sm"
          required
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700">
          Time (minutes)
        </label>
        <input
          type="number"
          value={time}
          onChange={(e) => setTime(Number(e.target.value))}
          className="mt-1 block w-full border rounded-md shadow-sm p-1.5 text-sm"
          required
          min="0"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full border rounded-md shadow-sm p-1.5 text-sm"
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </form>
  );
}
