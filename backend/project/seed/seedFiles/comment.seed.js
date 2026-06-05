import { Comment } from "../../models/comment.js";
import { User } from "../../models/user.js";
import { Game } from "../../models/game.js";
import { Tournament } from "../../models/tournament.js";

async function _seedGameComments(users, games) {
    const commentDocs = [];
    const finishedGames = games.filter(game => game.status === "finished");

    for (let i = 0; i < finishedGames.length; i++) {
        const game = finishedGames[i];
        const user1 = users[i % users.length];
        const user2 = users[(i + 1) % users.length];

        commentDocs.push(new Comment({
            userId: user1.userId,
            targetType: "game",
            targetId: game.gameId,
            content: "What a great game, well played!"
        }));

        commentDocs.push(new Comment({
            userId: user2.userId,
            targetType: "game",
            targetId: game.gameId,
            content: "That last round was intense!"
        }));
    }

    const deletedComment = new Comment({
        userId: users[0].userId,
        targetType: "game",
        targetId: finishedGames[0].gameId,
        content: "This comment has been removed by an admin.",
        isDeleted: true
    });
    commentDocs.push(deletedComment);

    await Promise.all(commentDocs.map(c => c.save()));
    console.log(`Inserted ${commentDocs.length} game comments`);
}

async function _seedTournamentComments(users, tournaments) {
    const commentDocs = [];

    for (let i = 0; i < tournaments.length; i++) {
        const tournament = tournaments[i];

        if (tournament.status === "cancelled") continue;

        const user1 = users[i % users.length];
        const user2 = users[(i + 1) % users.length];

        commentDocs.push(new Comment({
            userId: user1.userId,
            targetType: "tournament",
            targetId: tournament.tournamentId,
            content: "Can't wait for this tournament!"
        }));

        commentDocs.push(new Comment({
            userId: user2.userId,
            targetType: "tournament",
            targetId: tournament.tournamentId,
            content: "This is going to be amazing!"
        }));
    }

    await Promise.all(commentDocs.map(c => c.save()));
    console.log(`Inserted ${commentDocs.length} tournament comments`);
}

export async function seedComments() {
    await Comment.deleteMany({});
    console.log("Deleted existing comments");

    const users = await User.find({ role: "user" });
    const games = await Game.find();
    const tournaments = await Tournament.find();

    await _seedGameComments(users, games);
    await _seedTournamentComments(users, tournaments);
}
