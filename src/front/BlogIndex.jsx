// src/front/BlogIndex.jsx: /blog, every post.
import React from "react";
import { profile } from "../data/profile";
import { posts } from "./posts";
import { COLUMN, useTitle } from "./lib";
import { FollowOnX, FrontFooter, FrontHeader, PostList } from "./parts";

export default function BlogIndex() {
  useTitle(`Writing · ${profile.name}`);

  return (
    <>
      <FrontHeader />
      <main className={`${COLUMN} pb-24 pt-16 sm:pt-24`}>
        <h1 className="font-display text-4xl font-semibold leading-none text-bone">Writing</h1>
        <p className="prose-dark mt-5 text-pretty">
          Long write-ups of things I built, mostly the parts that went wrong first.
          New posts go out on X.
        </p>
        <div className="mt-6">
          <FollowOnX />
        </div>
        <div className="mt-12">
          <PostList posts={posts} />
        </div>
      </main>
      <FrontFooter />
    </>
  );
}
