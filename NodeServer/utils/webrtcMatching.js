const activePeers = new Map() // Store active peer connections
const waitingUsers = [] // Store users waiting to be matched
const rtcReadyPeers = new Set() // Store peers that have emitted RTC connected
const chatMessages = new Map() // Store chat messages between peers
const userFilters = new Map() // Store user filters to preserve them between matches
const sessionData = new Map() // Store session data until the session ends
import VideoSession from "../models/videosession.model.js"

export default function setupWebRTC(io) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`)

    socket.on("startMatching", ({ user, filters = {} }) => {
      const preservedFilters = userFilters.get(socket.id) || filters
      userFilters.set(socket.id, preservedFilters)

      console.log(
        `🔍 User ${socket.id} (${user.firstName}), AGE: (${user.userAge}),ID: (${user._id}) COUNTRY: (${user.country}), GENDER: (${user.gender}) IS ADMIN (${user.isAdmin}), is looking for a match...`,
      )
      console.log("🔍 With filters:", preservedFilters)

      const existingIndex = waitingUsers.findIndex((u) => u.socketId === socket.id)
      if (existingIndex !== -1) {
        waitingUsers.splice(existingIndex, 1)
      }

      let matchIndex = -1

      if (waitingUsers.length > 0) {
        matchIndex = waitingUsers.findIndex((waitingUser) => {
          if (preservedFilters.gender && !isGenderMatch(waitingUser.gender, preservedFilters.gender)) return false
          if (
            preservedFilters.ageRange &&
            (waitingUser.userAge < preservedFilters.ageRange[0] || waitingUser.userAge > preservedFilters.ageRange[1])
          )
            return false
          if (preservedFilters.country && waitingUser.country !== preservedFilters.country) return false

          const userMatchesTheirFilter =
            (!waitingUser.filters.gender || isGenderMatch(user.gender, waitingUser.filters.gender)) &&
            (!waitingUser.filters.ageRange ||
              (user.userAge >= waitingUser.filters.ageRange[0] && user.userAge <= waitingUser.filters.ageRange[1])) &&
            (!waitingUser.filters.country || user.country === waitingUser.filters.country)

          return userMatchesTheirFilter
        })
      }

      if (matchIndex !== -1) {
        const partner = waitingUsers.splice(matchIndex, 1)[0]
        activePeers.set(socket.id, partner.socketId)
        activePeers.set(partner.socketId, socket.id)

        const chatKey = getChatKey(socket.id, partner.socketId)
        chatMessages.set(chatKey, [])

        console.log(
          `✅ Match found between ${socket.id} (${user.firstName}) and ${partner.socketId} (${partner.firstName})`,
        )
        console.log(`${user.firstName}'s filters:`, preservedFilters)
        console.log(`${partner.firstName}'s filters:`, partner.filters)

        // Store session data for later saving when the session ends
        const sessionKey = chatKey
        sessionData.set(sessionKey, {
          user1: {
            id: user._id,
            socketId: socket.id,
            firstName: user.firstName,
            isAdmin: user.isAdmin || false,
            filters: preservedFilters,
            networkQuality: [],
            micActivity: [],
            cameraActivity: [],
          },
          user2: {
            id: partner._id,
            socketId: partner.socketId,
            firstName: partner.firstName,
            isAdmin: partner.isAdmin || false,
            filters: partner.filters,
            networkQuality: [],
            micActivity: [],
            cameraActivity: [],
          },
          startedAt: new Date(),
          chat: [],
        })

        console.log(`📝 Session data prepared for: ${user.firstName} and ${partner.firstName}`)

        io.to(socket.id).emit("matchFound", { partnerId: partner.socketId, partnerUser: partner })
        io.to(partner.socketId).emit("matchFound", { partnerId: socket.id, partnerUser: user })
      } else {
        waitingUsers.push({
          socketId: socket.id,
          firstName: user.firstName,
          avatar: user.avatar,
          userAge: user.userAge,
          country: user.country,
          gender: user.gender,
          isAdmin: user.isAdmin,
          _id: user._id,
          deviceType: user.deviceType,
          filters: preservedFilters,
        })
        console.log(`➕ Added ${socket.id} (${user.firstName}) to waiting list. Total waiting: ${waitingUsers.length}`)
        console.log("Current waiting users:")
        waitingUsers.forEach((wu, index) => {
          console.log(`${index + 1}. ${wu.firstName} (${wu.gender}), filters:`, wu.filters)
        })
      }
    })

    socket.on("sendChatMessage", ({ target, message }) => {
      if (activePeers.has(socket.id) && activePeers.get(socket.id) === target) {
        const chatKey = getChatKey(socket.id, target)
        const senderInfo = {
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        }

        const messageData = {
          sender: socket.id,
          message,
          timestamp: senderInfo.timestamp,
        }

        if (chatMessages.has(chatKey)) {
          chatMessages.get(chatKey).push(messageData)
        }

        // Store chat message in session data
        const sessionKey = chatKey
        if (sessionData.has(sessionKey)) {
          const session = sessionData.get(sessionKey)
          session.chat.push({
            sender: socket.id === session.user1.socketId ? session.user1.id : session.user2.id,
            message,
            timestamp: new Date(),
          })
        }

        io.to(target).emit("chatMessage", messageData)
      }
    })

    socket.on("getChatHistory", ({ target }) => {
      if (activePeers.has(socket.id) && activePeers.get(socket.id) === target) {
        const chatKey = getChatKey(socket.id, target)
        const history = chatMessages.get(chatKey) || []
        socket.emit("chatHistory", { history })
      }
    })

    socket.on("typing", ({ target, isTyping }) => {
      if (activePeers.has(socket.id) && activePeers.get(socket.id) === target) {
        io.to(target).emit("partnerTyping", { isTyping })
      }
    })

    socket.on("mic-toggle", ({ target, isMicOpen }) => {
      if (activePeers.has(socket.id) && activePeers.get(socket.id) === target) {
        io.to(target).emit("mic-toggle", { sender: socket.id, isMicOpen })

        // Track mic activity in session data
        const chatKey = getChatKey(socket.id, target)
        if (sessionData.has(chatKey)) {
          const session = sessionData.get(chatKey)
          const userKey = socket.id === session.user1.socketId ? "user1" : "user2"

          const lastActivity =
            session[userKey].micActivity.length > 0
              ? session[userKey].micActivity[session[userKey].micActivity.length - 1]
              : null

          if (isMicOpen) {
            // If turning on mic and no open activity, create new one
            if (!lastActivity || lastActivity.closedAt) {
              session[userKey].micActivity.push({
                openedAt: new Date(),
              })
            }
          } else {
            // If turning off mic and there's an open activity, close it
            if (lastActivity && !lastActivity.closedAt) {
              lastActivity.closedAt = new Date()
              const durationMs = lastActivity.closedAt.getTime() - lastActivity.openedAt.getTime()
              lastActivity.durationSeconds = Math.floor(durationMs / 1000)
            }
          }
        }
      }
    })

    socket.on("camera-toggle", ({ target, isCameraOn }) => {
      if (activePeers.has(socket.id) && activePeers.get(socket.id) === target) {
        io.to(target).emit("camera-toggle", { sender: socket.id, isCameraOn })

        // Track camera activity in session data
        const chatKey = getChatKey(socket.id, target)
        if (sessionData.has(chatKey)) {
          const session = sessionData.get(chatKey)
          const userKey = socket.id === session.user1.socketId ? "user1" : "user2"

          const lastActivity =
            session[userKey].cameraActivity.length > 0
              ? session[userKey].cameraActivity[session[userKey].cameraActivity.length - 1]
              : null

          if (isCameraOn) {
            // If turning on camera and no open activity, create new one
            if (!lastActivity || lastActivity.closedAt) {
              session[userKey].cameraActivity.push({
                openedAt: new Date(),
              })
            }
          } else {
            // If turning off camera and there's an open activity, close it
            if (lastActivity && !lastActivity.closedAt) {
              lastActivity.closedAt = new Date()
              const durationMs = lastActivity.closedAt.getTime() - lastActivity.openedAt.getTime()
              lastActivity.durationSeconds = Math.floor(durationMs / 1000)
            }
          }
        }
      }
    })

    socket.on("offer", ({ target, offer }) => {
      if (activePeers.has(socket.id) && activePeers.get(socket.id) === target) {
        io.to(target).emit("offer", { sender: socket.id, offer })
      }
    })

    socket.on("answer", ({ target, answer }) => {
      if (activePeers.has(socket.id) && activePeers.get(socket.id) === target) {
        io.to(target).emit("answer", { sender: socket.id, answer })
      }
    })

    socket.on("ice-candidate", ({ target, candidate }) => {
      if (activePeers.has(socket.id) && activePeers.get(socket.id) === target) {
        io.to(target).emit("ice-candidate", { sender: socket.id, candidate })
      }
    })

    socket.on("rtc-connected", ({ target }) => {
      rtcReadyPeers.add(socket.id)

      if (rtcReadyPeers.has(target)) {
        io.to(socket.id).emit("rtc-fully-connected")
        io.to(target).emit("rtc-fully-connected")

        rtcReadyPeers.delete(socket.id)
        rtcReadyPeers.delete(target)
      }
    })

    socket.on("leaveVideoRoom", () => {
      const partnerId = activePeers.get(socket.id)
      if (partnerId) {
        io.to(partnerId).emit("partnerDisconnected")

        // Save the session data to the database when the session ends
        const chatKey = getChatKey(socket.id, partnerId)
        if (sessionData.has(chatKey)) {
          const session = sessionData.get(chatKey)
          saveVideoSession(session, "disconnect")
            .then((sessionId) => {
              console.log(`✅ VIDEO SESSION SAVED: ${sessionId}`)
            })
            .catch((err) => {
              console.error("❌ Error saving video session:", err)
            })

          // Clean up session data
          sessionData.delete(chatKey)
        }

        activePeers.delete(socket.id)
        activePeers.delete(partnerId)
        chatMessages.delete(chatKey)
        rtcReadyPeers.delete(socket.id)
        rtcReadyPeers.delete(partnerId)
      }

      const waitingIndex = waitingUsers.findIndex((u) => u.socketId === socket.id)
      if (waitingIndex !== -1) {
        waitingUsers.splice(waitingIndex, 1)
        console.log(`➖ Removed ${socket.id} from waiting list. Total waiting: ${waitingUsers.length}`)
      }
      userFilters.delete(socket.id)
    })

    socket.on("skipMatch", ({ user }) => {
      const partnerId = activePeers.get(socket.id)
      if (partnerId) {
        io.to(partnerId).emit("partnerDisconnected")

        // Save the session data to the database when the session ends
        const chatKey = getChatKey(socket.id, partnerId)
        if (sessionData.has(chatKey)) {
          const session = sessionData.get(chatKey)
          saveVideoSession(session, "skip")
            .then((sessionId) => {
              console.log(`✅ VIDEO SESSION SAVED: ${sessionId}`)
            })
            .catch((err) => {
              console.error("❌ Error saving video session:", err)
            })

          // Clean up session data
          sessionData.delete(chatKey)
        }

        activePeers.delete(socket.id)
        activePeers.delete(partnerId)
        chatMessages.delete(chatKey)
        rtcReadyPeers.delete(socket.id)
        rtcReadyPeers.delete(partnerId)
      }

      const waitingIndex = waitingUsers.findIndex((u) => u.socketId === socket.id)
      if (waitingIndex !== -1) {
        waitingUsers.splice(waitingIndex, 1)
        console.log(`➖ Removed ${socket.id} from waiting list for skip. Total waiting: ${waitingUsers.length}`)
      }

      const preservedFilters = userFilters.get(socket.id) || {}
      userFilters.set(socket.id, preservedFilters)

      console.log(
        `🔄 User ${socket.id} (${user.firstName}) is skipping to find a new match with preserved filters:`,
        preservedFilters,
      )

      socket.emit("startMatching", {
        user,
        filters: preservedFilters,
      })
    })

    socket.on("network-quality", ({ target, quality }) => {
      if (activePeers.get(socket.id) === target) {
        io.to(target).emit("partner-network-quality", {
          socketId: socket.id,
          quality,
        })

        // Log network quality in session data
        const chatKey = getChatKey(socket.id, target)
        if (sessionData.has(chatKey)) {
          const session = sessionData.get(chatKey)
          const userKey = socket.id === session.user1.socketId ? "user1" : "user2"

          session[userKey].networkQuality.push({
            quality,
            timestamp: new Date(),
          })
        }
      }
    })

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`)
      const partnerId = activePeers.get(socket.id)
      if (partnerId) {
        io.to(partnerId).emit("partnerDisconnected")

        // Save the session data to the database when the session ends
        const chatKey = getChatKey(socket.id, partnerId)
        if (sessionData.has(chatKey)) {
          const session = sessionData.get(chatKey)
          saveVideoSession(session, "disconnect")
            .then((sessionId) => {
              console.log(`✅ VIDEO SESSION SAVED: ${sessionId}`)
            })
            .catch((err) => {
              console.error("❌ Error saving video session on disconnect:", err)
            })

          // Clean up session data
          sessionData.delete(chatKey)
        }

        activePeers.delete(socket.id)
        activePeers.delete(partnerId)
        chatMessages.delete(chatKey)
        rtcReadyPeers.delete(socket.id)
        rtcReadyPeers.delete(partnerId)
      }

      const waitingIndex = waitingUsers.findIndex((u) => u.socketId === socket.id)
      if (waitingIndex !== -1) {
        waitingUsers.splice(waitingIndex, 1)
        console.log(`➖ Removed ${socket.id} from waiting list. Total waiting: ${waitingUsers.length}`)
      }

      userFilters.delete(socket.id)
    })
  })
}

// Helper function to save a video session to the database
async function saveVideoSession(sessionData, terminationReason = "unknown", errorMessage = null) {
  try {
    // Calculate session duration
    const endedAt = new Date()
    const durationMs = endedAt.getTime() - sessionData.startedAt.getTime()
    const durationSeconds = Math.floor(durationMs / 1000)

    // Create the session document
    const session = new VideoSession({
      participants: {
        user1: sessionData.user1.id,
        user2: sessionData.user2.id,
      },
      isAdmin: {
        user1: sessionData.user1.isAdmin || false,
        user2: sessionData.user2.isAdmin || false,
        bothAreAdmins: (sessionData.user1.isAdmin && sessionData.user2.isAdmin) || false,
        anyIsAdmin: sessionData.user1.isAdmin || sessionData.user2.isAdmin || false,
      },
      filtersUsed: {
        user1: {
          gender: sessionData.user1.filters.gender || null,
          ageRange: sessionData.user1.filters.ageRange || [18, 99],
          country: sessionData.user1.filters.country || null,
        },
        user2: {
          gender: sessionData.user2.filters.gender || null,
          ageRange: sessionData.user2.filters.ageRange || [18, 99],
          country: sessionData.user2.filters.country || null,
        },
      },
      startedAt: sessionData.startedAt,
      endedAt: endedAt,
      durationSeconds: durationSeconds,
      chat: sessionData.chat,
      networkQuality: {
        user1: sessionData.user1.networkQuality,
        user2: sessionData.user2.networkQuality,
      },
      micActivity: {
        user1: sessionData.user1.micActivity,
        user2: sessionData.user2.micActivity,
      },
      cameraActivity: {
        user1: sessionData.user1.cameraActivity,
        user2: sessionData.user2.cameraActivity,
      },
      termination: {
        reason: terminationReason,
        errorMessage: errorMessage || undefined,
      },
    })

    const savedSession = await session.save()
    console.log(`✅ VIDEO SESSION CREATED: ${savedSession.sessionId} | MongoDB ID: ${savedSession._id}`)
    console.log(`   - User1: ${sessionData.user1.firstName} (${sessionData.user1.id})`)
    console.log(`   - User2: ${sessionData.user2.firstName} (${sessionData.user2.id})`)
    console.log(`   - Duration: ${durationSeconds} seconds`)
    console.log(`   - Started at: ${sessionData.startedAt}`)
    console.log(`   - Ended at: ${endedAt}`)
    console.log(`   - Termination reason: ${terminationReason}`)
    return savedSession.sessionId
  } catch (error) {
    console.error("❌ ERROR CREATING VIDEO SESSION:")
    console.error(`   - User1: ${sessionData.user1.firstName} (${sessionData.user1.id})`)
    console.error(`   - User2: ${sessionData.user2.firstName} (${sessionData.user2.id})`)
    console.error(`   - Error: ${error.message}`)
    // Don't throw, just return null to indicate failure
    return null
  }
}

function isGenderMatch(userGender, filterGender) {
  if (!filterGender) return true
  const normalizedUserGender = userGender ? userGender.toLowerCase() : ""
  const normalizedFilterGender = filterGender.toLowerCase()
  return normalizedUserGender === normalizedFilterGender
}

function getChatKey(id1, id2) {
  return [id1, id2].sort().join("-")
}
