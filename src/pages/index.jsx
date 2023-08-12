import Counter from '../Counter';

export default function Page({test}) {
  return (
    <main>
      {test}
      <Counter />
      <a href="/login">Login</a>
    </main>
  );
}
