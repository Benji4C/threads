'use server'

import { connectToDB } from "../mongoose";
import Thread from "../models/thread.model";
import User from "../models/user.mdel";
import { revalidatePath } from "next/cache";

interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string

}

export async function createThread ({ text, author, communityId, path }: Params){
try {
    connectToDB()
const createdThread = await Thread.create({
    text,
    author,
    community: null
})

await User.findByIdAndUpdate(author, {
    $push: {threads: createdThread._id}
})
revalidatePath(path)
} catch (error: any) {
    throw new Error (`Error creating thread: ${error.message}`)
}
}

export async function fetchPosts(pageNumber = 1, pageSize =20){
    connectToDB()

// calculate the number of posts to skip
const skipAmount = ( pageNumber - 1) * pageSize

    // fetch the posts that have no parents (top-level threads)
    const postQuery = Thread.find({ parentId: { $in: [null, undefined]}})
    .sort({ createdAt: 'desc'})
    .skip(skipAmount)
    .populate({ path: 'author', model: User })
    .populate({
        path: 'children',
        populate: {
            path: 'author',
            model: User,
            select: '_id name parentId image'
        }
    })
    const totalPostCount = await Thread.countDocuments({ parentId: { $in: [null, undefined]}})

    const  posts = await postQuery.exec()

    const isNext = totalPostCount > skipAmount + posts.length
    return { posts, isNext}
}

export async function  fetchThreadById(id: string){
    connectToDB()
    try {
        const thread = await Thread.findById(id)
        .populate({
            path: 'author',
            model: User,
            select: '_id id name image'
        })
        .populate({
            path: 'children',
            populate : [
                {
                    path: 'author',
                    model: User,
                    select: '_id id name parentId'
                },
                {
                    path: 'children',
                    model: Thread,
                    populate: {
                        path : 'author',
                        model: User,
                        select: '_id id name parentId image'
                    }
                }
            ]
        }).exec()

        return thread
    } catch (error:any) {
        throw new Error (`Error fetching thread: ${error.message}`)
    }
}