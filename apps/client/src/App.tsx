import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Landing } from "@/pages/Landing";
import { Processing } from "@/pages/Processing";
import { StudyPack } from "@/pages/StudyPack";
import { Battle } from "@/pages/Battle";
import { Community } from "@/pages/Community";
import { Chat } from "@/pages/Chat";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="processing/:packId" element={<Processing />} />
        <Route path="study/:packId" element={<StudyPack />} />
        <Route path="battle/:code" element={<Battle />} />
        <Route path="community" element={<Community />} />
        <Route path="chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
