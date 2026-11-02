import { useState } from 'react';
import { FeatureCard } from './components/FeatureCard';
import './App.css';

const FEATURES = [
  {
    title: 'Components',
    description: 'Each piece of UI lives in src/components. Add a file there and import it where you need it.',
  },
  {
    title: 'Plain CSS',
    description: 'Styles are plain CSS. The tokens at the top of src/index.css set colors, radius and type.',
  },
  {
    title: 'TypeScript',
    description: 'Props and state are typed, so mistakes show up while you edit instead of in the browser.',
  },
];

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="header">
        <span className="brand">React app</span>
      </header>

      <main className="hero">
        <h1>Start building here.</h1>
        <p>This is a React and TypeScript starter. Replace this page with your app: edit src/App.tsx to begin.</p>
        <div className="actions">
          <button className="button button--primary" onClick={() => setCount((value) => value + 1)}>
            Click me
          </button>
          <button className="button" onClick={() => setCount(0)}>
            Reset
          </button>
          <span className="count">Clicked {count} times</span>
        </div>
      </main>

      <section className="features">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} title={feature.title} description={feature.description} />
        ))}
      </section>

      <footer className="footer">Made with Agent Grid</footer>
    </div>
  );
}
