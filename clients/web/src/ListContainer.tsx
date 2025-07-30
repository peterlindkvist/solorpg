import { useCallback, useState } from "react";
import "./ListContainer.css";
import * as api from "./utils/api";

function GameContainer() {
  const [bookList, setListBooks] = useState<{ name: string; url: string }[]>();

  const fetchBookList = useCallback(() => {
    api.listStories().then((bookList) => {
      setListBooks(bookList);
    });
  }, []);

  if (!bookList) {
    fetchBookList();
  }

  return (
    <>
      <div className="list-container">
        <h1>Available Books</h1>
        {bookList === undefined && <p>Loading...</p>}
        {bookList && bookList.length === 0 && <p>No books available</p>}
        <ul>
          {bookList &&
            bookList.map((book) => (
              <li key={book.name}>
                <a href={book.url}>{book.name}</a>
              </li>
            ))}
        </ul>
      </div>
    </>
  );
}

export default GameContainer;
