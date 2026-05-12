-- TEAMER DATABASE SCHEMA (fixed order)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  skill TEXT CHECK (skill IN ('developer', 'designer', 'marketer', 'researcher', 'product_manager', 'data_analyst', 'writer', 'other')),
  bio TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ORGANIZATIONS
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ORG MEMBERS (after both profiles and organizations)
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  status TEXT CHECK (status IN ('invited', 'active', 'removed')) DEFAULT 'invited',
  invited_by UUID REFERENCES profiles(id),
  invite_token TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('assigned', 'in_progress', 'submitted', 'approved', 'rejected')) DEFAULT 'assigned',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  deadline TIMESTAMPTZ,
  week_number INT,
  week_year INT,
  submission_text TEXT,
  submission_url TEXT,
  submission_note TEXT,
  reviewer_note TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- TASK ATTACHMENTS
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- TASK COMMENTS
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- ANNOUNCEMENTS
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Organizations
CREATE POLICY "Org members can view their org"
  ON organizations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
        AND org_members.status = 'active'
    ) OR owner_id = auth.uid()
  );

CREATE POLICY "Owners can update org"
  ON organizations FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create org"
  ON organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete org"
  ON organizations FOR DELETE USING (owner_id = auth.uid());

-- Org Members
CREATE POLICY "Members can view org membership"
  ON org_members FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members om2
      WHERE om2.user_id = auth.uid() AND om2.status = 'active'
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Admins/owners can manage members"
  ON org_members FOR ALL USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

CREATE POLICY "Insert new member invites"
  ON org_members FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Tasks
CREATE POLICY "Org members can view tasks"
  ON tasks FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins/owners can create tasks"
  ON tasks FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = tasks.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

CREATE POLICY "Owners/admins can update any task; assignees can update their own"
  ON tasks FOR UPDATE USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = tasks.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

CREATE POLICY "Owners/admins can delete tasks"
  ON tasks FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = tasks.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Task Attachments
CREATE POLICY "Org members can view attachments"
  ON task_attachments FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Task assignees and admins can upload"
  ON task_attachments FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Task Comments
CREATE POLICY "Org members can read comments"
  ON task_comments FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Org members can write comments"
  ON task_comments FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Announcements
CREATE POLICY "Org members can read announcements"
  ON announcements FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins/owners can manage announcements"
  ON announcements FOR ALL USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = announcements.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Notifications
CREATE POLICY "Users see own notifications"
  ON notifications FOR ALL USING (user_id = auth.uid());

-- FUNCTIONS

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_member org_members;
BEGIN
  SELECT * INTO v_member FROM org_members WHERE invite_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid invite token');
  END IF;
  IF v_member.status = 'active' THEN
    RETURN jsonb_build_object('error', 'Invite already accepted');
  END IF;
  UPDATE org_members
  SET status = 'active', user_id = auth.uid(), joined_at = NOW()
  WHERE invite_token = p_token;
  RETURN jsonb_build_object('success', true, 'org_id', v_member.org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;