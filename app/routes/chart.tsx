import React from "react";

// --- Komponenter ---

const VerifierTag = ({ text, verified }) => (
  <span
    className={`text-xs px-2 py-0.5 rounded-md font-medium border transition inline-block  mr-1 mb-1 mt-1 ${
      verified
        ? "bg-green-600 text-white border-green-700 hover:bg-green-700"
        : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
    }`}
    title={text}
  >
    {text}
  </span>
);

const SubBox = ({ title, people = [] }) => (
  <div className="border border-neutral-600 rounded-md p-2 text-xs bg-neutral-800 text-neutral-200 whitespace-normal break-words shadow-sm mb-2 last:mb-0">
    <div className="font-medium text-sm mb-1.5 text-white">{title}</div>
    {people.length > 0 ? (
      <div className="">
        {people.map((person, index) => (
          <VerifierTag
            key={index}
            text={person.name}
            verified={person.verified}
          />
        ))}
      </div>
    ) : (
      <div className="text-gray-500 italic text-xs"></div>
    )}
  </div>
);
const OrgBox = ({
  title,
  people = [],
  assistantPeople = [],
  roleTitle = "Lead", // Används nu som etikett
  assistantRoleTitle = "Assistant", // Används nu som etikett
  children,
  className = ""
}) => {
  const hasLeadershipRoles = people.length > 0 || assistantPeople.length > 0;
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const hasChildren = validChildren.length > 0;

  return (
    <div
      className={`border border-neutral-700 rounded-lg p-2 min-w-[180px] text-sm bg-neutral-900 shadow-md flex flex-col ${className}`} // Lade till flex flex-col
    >
      {/* --- Header Area --- */}
      <div className="mb-2 "> {/* Omslutande div för titel och namn */}
        {/* Huvudtitel */}
        <div className="font-semibold text-white mb-1.5 text-base whitespace-normal break-words">
          {title}
        </div>

        {/* NYTT: Område för Lead/Assistant namn direkt under titeln */}
        {hasLeadershipRoles && (
          <div className="text-xs space-y-1 px-1"> {/* Centrerad text, lite padding/space */}
            {people.length > 0 && (
              <div>
                <span className="font-medium text-neutral-400 mr-1.5">{roleTitle}:</span>
                {people.map((person, index) => (
                  <div className=""><VerifierTag key={`lead-${index}`} text={person.name} verified={person.verified} /></div>
                ))}
              </div>
            )}
            {assistantPeople.length > 0 && (
              <div>
                <span className="font-medium text-neutral-400 mr-1.5">{assistantRoleTitle}:</span>
                {assistantPeople.map((person, index) => (
                  <div className=""> <VerifierTag key={`assist-${index}`} text={person.name} verified={person.verified} /></div>
                ))}
              </div>
            )}
          </div>
        )}
      </div> {/* Slut på Header Area */}


      {/* --- Content Area (Avdelare + Barn) --- */}
      {/* Avdelare visas endast om det finns barn (underavdelningar) */}
      {hasChildren && (
        <div className="mt-auto pt-2 border-t border-neutral-600"> {/* mt-auto puttar ner detta om boxen blir hög */}
           <div className="space-y-1">
              {validChildren}
           </div>
        </div>
      )}
    </div>
  );
};


// --- Organisationsdata ---

const conventionCommitteeData = {
  title: "Convention Committee",
  coordinator: {
    title: "Conv. Comm. Coordinator",
    people: [ { name: "Jan Kraft", verified: true }],
    assistantPeople: [{name: "Magnus Linderoth", verified: true}],
    roleTitle: "CCC",
    assistantRoleTitle: "CCCA",
    departments: [
      { title: "Accounts", people: [] },
      { title: "Attendants", people: [] },
      { title: "First Aid", people: [] },
      { title: "Parking", people: [] },
    ],
  },
  programOverseer: {
    title: "Program Overseer",
    people: [{ name: "Joakim Östman", verified: true }],
    assistantPeople: [{ name: "Anton Karlsson", verified: true }],
    roleTitle: "PO",
    assistantRoleTitle: "POA",
    departments: [
      { title: "Audio/Video", people: [] },
      { title: "Baptism", people: [] },
    ],
  },
  roomingOverseer: {
    title: "Rooming Overseer",
    people: [{ name: "Mikael Vähäkari", verified: true } ],
    assistantPeople: [{ name: "Tobias Wright", verified: true} ],
    roleTitle: "RO",
    assistantRoleTitle: "ROA",
    departments: [
      { title: "Cleaning", people: [] },
      { title: "Information & Vol. Service", people: [] },
      { title: "Installation", people: [] },
      { title: "Lost & Found", people: [] },
      { title: "Rooming", people: [] },
      { title: "Trucking & Equipment", people: [] },
    ],
  },
};

const directAppointmentsData = {
    title: "Direct Appointments",
    departments: [
        { title: "Contract Representative", people: [{ name: "Jan Kraft", verified: true }] },
        { title: "Contract Negotiator", people: [ { name: "Anastasios Pennou", verified: true }] },
        { title: "Rooming Coordinator", people: [{ name: "Lars Brorsson", verified: true }] },
        { title: "Technical Contact", people: [{ name: "Mattias Dahlblom", verified: true }] },
        { title: "Creative Team Coordinator", people: [{ name: "Stefan Sigemo", verified: true }] },
    ],
    guestResources: {
        title: "Guest Branch Resources",
        departments: [
            { title: "Contact", people: [] },
            { title: "Translators", people: [] },
            { title: "Proofreaders", people: [] },
        ]
    }
};

const hospitalityCommitteeData = {
  title: "Hospitality Committee",
  hc1: {
    title: "HC-1",
    people: [{ name: "Lars Brorsson", verified: true }],
    assistantPeople: [ {name: "Robert Claeson", verified: true }, {name: "Dennis Greus", verified: true }],
    roleTitle: "HC-1",
    assistantRoleTitle: "HCA-1",
    departments: [
      { title: "Airports", people: [] },
      { title: "Delegate Rooming", people: [{ name: "Raymond Beaini", verified: false }] },
      { title: "Transportation", people: [] },
    ],
  },
  hc2: {
    title: "HC-2",
    people: [{ name: "Benjamin Hugó", verified: true }],
    assistantPeople: [{name: "Alexander Tripkous", verified: true }],
    roleTitle: "HC-2",
    assistantRoleTitle: "HCA-2",
    departments: [
      { title: "Activities", people: [] },
      { title: "Evening Gathering", people: [] },
      { title: "Food", people: [] },
    ],
  },
  hc3: {
    title: "HC-3",
    people: [{name: "Björn Gullberg", verified: true}],
    assistantPeople: [{name: "Daniel Leidstedt", verified: true}],
    roleTitle: "HC-3",
    assistantRoleTitle: "HCA-3",
    departments: [
      { title: "Delegate Management", people: [ {name: "Mikael Jonsson", verified: false}] },
      { title: "Volunteer Management", people: [{name: "Mikael Jonsson", verified: false}] },
      { title: "Safety", people: [{name: "Peter Johansson", verified: false}] },
    ],
  },
};

// --- Huvudkomponent ---
export default function ConventionOrgChart() {
  const { coordinator, programOverseer, roomingOverseer } = conventionCommitteeData;
  const { hc1, hc2, hc3 } = hospitalityCommitteeData;

  return (
    <div className="p-2 pt-5 fixed top-0 bg-neutral-950 text-white min-h-screen overflow-x-auto z-99 w-full">
      <h1 className="text-xl font-bold text-center mb-4">Convention Organization Chart</h1>

      {/* ÄNDRING HÄR: flex-wrap borttagen för att förhindra radbrytning */}
      <div className="flex justify-start items-start gap-2 pb-4">

        {/* Convention Committee */}
        <OrgBox title={conventionCommitteeData.title} className="flex-shrink-0">
          <div className="flex flex-row items-start gap-2">
            <OrgBox
              title={coordinator.title}
              people={coordinator.people}
              assistantPeople={coordinator.assistantPeople}
              roleTitle={coordinator.roleTitle}
              assistantRoleTitle={coordinator.assistantRoleTitle}
            >
              {coordinator.departments.map((dep, i) => (
                <SubBox key={`coord-dep-${i}`} title={dep.title} people={dep.people} />
              ))}
            </OrgBox>

            <OrgBox
               title={programOverseer.title}
               people={programOverseer.people}
               assistantPeople={programOverseer.assistantPeople}
               roleTitle={programOverseer.roleTitle}
               assistantRoleTitle={programOverseer.assistantRoleTitle}
            >
                 {programOverseer.departments.map((dep, i) => (
                    <SubBox key={`prog-dep-${i}`} title={dep.title} people={dep.people} />
                 ))}
            </OrgBox>

            <OrgBox
                title={roomingOverseer.title}
                people={roomingOverseer.people}
                assistantPeople={roomingOverseer.assistantPeople}
                roleTitle={roomingOverseer.roleTitle}
                assistantRoleTitle={roomingOverseer.assistantRoleTitle}
            >
               {roomingOverseer.departments.map((dep, i) => (
                <SubBox key={`room-dep-${i}`} title={dep.title} people={dep.people} />
              ))}
            </OrgBox>
          </div>
        </OrgBox>

        {/* Middle Section - Direct Appointments */}
        <OrgBox title={directAppointmentsData.title} className="flex-shrink-0 self-start">
           {directAppointmentsData.departments.map((dep, i) => (
                <SubBox key={`direct-${i}`} title={dep.title} people={dep.people} />
            ))}
          <div className="pt-3 mt-3 border-t border-neutral-600">
            <div className="text-sm text-gray-400 mb-2">{directAppointmentsData.guestResources.title}</div>
             {directAppointmentsData.guestResources.departments.map((dep, i) => (
                <SubBox key={`guest-${i}`} title={dep.title} people={dep.people} />
            ))}
          </div>
        </OrgBox>

        {/* Hospitality Committee */}
        <OrgBox title={hospitalityCommitteeData.title} className="flex-shrink-0">
          <div className="flex flex-row items-start gap-1">
             <OrgBox
                title={hc1.title}
                people={hc1.people}
                assistantPeople={hc1.assistantPeople}
                roleTitle={hc1.roleTitle}
                assistantRoleTitle={hc1.assistantRoleTitle}
             >
               {hc1.departments.map((dep, i) => (
                <SubBox key={`hc1-dep-${i}`} title={dep.title} people={dep.people} />
              ))}
            </OrgBox>
             <OrgBox
                title={hc2.title}
                people={hc2.people}
                assistantPeople={hc2.assistantPeople}
                roleTitle={hc2.roleTitle}
                assistantRoleTitle={hc2.assistantRoleTitle}
             >
               {hc2.departments.map((dep, i) => (
                <SubBox key={`hc2-dep-${i}`} title={dep.title} people={dep.people} />
              ))}
            </OrgBox>
              <OrgBox
                title={hc3.title}
                people={hc3.people}
                assistantPeople={hc3.assistantPeople}
                roleTitle={hc3.roleTitle}
                assistantRoleTitle={hc3.assistantRoleTitle}
             >
               {hc3.departments.map((dep, i) => (
                <SubBox key={`hc3-dep-${i}`} title={dep.title} people={dep.people} />
              ))}
            </OrgBox>
          </div>
        </OrgBox>

      </div>
    </div>
  );
}

// Komponenter (OrgBox, SubBox, VerifierTag), PERSON_ definitioner och dataobjekt
// ska finnas *före* denna komponent i din fil.