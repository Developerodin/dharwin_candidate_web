const users = [
    {
        id: 1,
        name: "Nishant Jain",
    },
    {
        id: 2,
        name: "Ronak Vaya",
    },
    {
        id: 3,
        name: "Rajesh Gupta",
    },
    {
        id: 4,
        name: "Yash Raj",
    },
    {
        id: 5,
        name: "Amit Patel",
    },
    {
        id: 6,
        name: "Aakash Sharma",
    },
    {
        id: 7,
        name: "Viren Gupta",
    },
    {
        id: 8,
        name: "Sam Jain",
    },
    {
        id: 9,
        name: "Rajesh Gupta",
    },
    {
        id: 10,
        name: "John Doe",
    },
]

const isScreenSharing = true;

export default function MeetingPage() {
    return (
        <div className="min-h-screen flex flex-col">
          {isScreenSharing &&
            <header className="flex justify-between border border-gray-700 rounded-md p-2 m-3 mb-1 bg-gray-800/90">
              <div className="flex items-center">
                <i className="ri-arrow-up-line text-md font-bold mr-2 border px-1.5 pt-0.5"></i>
                <h3 className="text-xs">Nishant Jain (Presenting)</h3>
              </div>
              <button className="text-xs bg-red-600 text-white px-4 py-1 rounded-lg">Stop Presenting</button>
            </header>
          }
          
          <main className="md:flex flex-1 p-3">
            <div className={`${isScreenSharing ? 'h-[calc(50vh-66px)] mb-4 md:mb-0 md:min-h-[calc(100vh-124px)] md:w-2/3 w-full' : 'hidden'} flex items-center justify-center bg-gray-800/90 border border-gray-700 rounded-lg p-4 mr-4`}>
              <span className="">
                <i className="ri-macbook-line text-5xl block mb-2"></i>
              </span>
            </div>
            <div className={`relative ${isScreenSharing ? 'w-full md:w-1/3' : 'w-full'}`}>
              {/* if only one user joined  */}
              {users.length === 1 && 
                users.map((user) => (
                  <div key={user.id} className={`relative w-full ${isScreenSharing ? 'min-h-[calc(50vh-66px)] md:min-h-[calc(100vh-124px)]' : 'min-h-[calc(100vh-124px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                    <span className="text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-20 h-20">{user.name.split(" ")[0][0]}</span>
                    <span className="absolute bottom-[10px] left-[10px] text-white text-sm">{user.name}</span>
                    <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                  </div>
                ))
              }
              {/* if two user joined  */}
              {users.length === 2 && 
                <div className={`${isScreenSharing ? 'grid grid-cols-2 md:grid-cols-1 gap-2' : ''}`}>
                  <div className={`relative w-full ${isScreenSharing ? 'min-h-[calc(50vh-66px)]' : 'min-h-[calc(50vh-66px)] sm:min-h-[calc(100vh-124px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                    <span className="text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-20 h-20">{users[0].name.split(" ")[0][0]}</span>
                    <span className="absolute bottom-[10px] left-[10px] text-white text-sm">{users[0].name}</span>
                    <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                  </div>
                  <div className={`absolute ${isScreenSharing ? 'min-h-[calc(50vh-66px)] relative' : 'min-h-[calc(50vh-66px)] sm:bottom-[10px] sm:right-[10px] sm:w-[250px] sm:h-[125px] sm:min-h-0 sm:mt-0 mt-2'} w-full rounded-md bg-green-500 flex items-center justify-center`}>
                    <span className={`text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-20 h-20 ${isScreenSharing ? '' : 'sm:w-10 sm:h-10 sm:text-xl'}`}>{users[1].name.split(" ")[0][0]}</span>
                    <span className={`absolute bottom-[5px] left-[10px] text-white text-sm ${isScreenSharing ? '' : 'sm:text-xs'}`}>{users[1].name}</span>
                    <span className="absolute top-[10px] right-[10px] bg-green-700 rounded-full sm:w-5 sm:h-5 w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                  </div>
                </div>
              }
              {/* if three user joined  */}
              {users.length === 3 &&
                <div className={`${isScreenSharing ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} grid gap-4`}>
                  {users.map((user) => (
                    <div key={user.id} className={`relative w-full ${isScreenSharing ? 'min-h-[calc(30vh-66px)] md:min-h-[calc(35vh-66px)] lg:min-h-[calc(35vh-66px)]' : 'md:min-h-[calc(50vh-66px)] lg:min-h-[calc(100vh-124px)] min-h-[calc(35vh-66px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                      <span className="text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-20 h-20">{user.name.split(" ")[0][0]}</span>
                      <span className="absolute bottom-[10px] left-[10px] text-white text-sm">{user.name}</span>
                      <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                    </div>
                  ))}
                </div>
              }
              {users.length > 3 &&
                <>
                  {/* Grid for screens smaller than large - shows 4 users */}
                  {isScreenSharing &&
                    <div className={`md:hidden grid grid-cols-2 md:grid-cols-${isScreenSharing ? 2 : users.length === 4 ? 2 : users.length === 5 ? 3 : users.length === 6 ? 3 : 4} gap-4`}>
                      {users.slice(0, 4).map((user, index) => (
                        <div key={user.id} className={`relative w-full ${isScreenSharing ? 'min-h-[calc(28vh-66px)] md:min-h-[calc(28vh-66px)]' : 'min-h-[calc(33vh-66px)] md:min-h-[calc(50vh-66px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                          <span className="text-xl sm:text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20">{user.name.split(" ")[0][0]}</span>
                          <span className="absolute bottom-[10px] left-[10px] text-white text-xs sm:text-sm">{user.name}</span>
                          <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                          {index === 3 && users.length > 4 && (
                            <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center">
                              <span className="text-white text-xl md:text-2xl font-medium">+{users.length - 3} more</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  }
                  {/* Grid for large screens and above - shows 8 users */}
                  <div className={`${isScreenSharing ? 'hidden md:grid grid-cols-2' : 'grid grid-cols-2'} md:grid-cols-${isScreenSharing ? 2 : users.length === 4 ? 2 : users.length === 5 ? 3 : users.length === 6 ? 3 : 4} gap-4`}>
                    {users.slice(0, 8).map((user, index) => (
                      <div key={user.id} className={`relative w-full ${isScreenSharing ? 'min-h-[calc(28vh-66px)] md:min-h-[calc(28vh-66px)]' : 'min-h-[calc(30vh-66px)] md:min-h-[calc(50vh-66px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                        <span className="text-xl sm:text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20">{user.name.split(" ")[0][0]}</span>
                        <span className="absolute bottom-[10px] left-[10px] text-white text-xs sm:text-sm">{user.name}</span>
                        <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                        {index === 7 && users.length > 8 && (
                          <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center">
                            <span className="text-white text-xl md:text-2xl font-medium">+{users.length - 7} more</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              }
            </div>
          </main>

          <footer className="w-full mt-auto">
            <div className="flex justify-center p-1">
              <div className="inline-flex items-center gap-3 px-3 py-2 rounded-full bg-gray-800/90 border border-gray-700">
                <button title="Mute/Unmute" className="px-4 py-1 rounded-full bg-gray-700 text-white hover:bg-gray-600">
                  <i className="ri-mic-off-line text-lg"></i>
                </button>
                <button title="Turn camera on/off" className="px-4 py-1 rounded-full bg-gray-700 text-white hover:bg-gray-600">
                  <i className="ri-video-line text-lg"></i>
                </button>
                <button title="Present now" className="px-4 py-1 rounded-full text-white bg-gray-700 hover:bg-gray-600">
                  <i className="ri-presentation-line text-lg"></i>
                </button>
                <button title="Leave call" className="px-4 py-1 rounded-full bg-red-600 text-white hover:bg-red-700">
                  <i className="ri-phone-fill text-lg" style={{ transform: 'rotate(135deg)' }}></i>
                </button>
              </div>
            </div>
          </footer>
        </div>
    )
}